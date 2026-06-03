"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Msg = { role: "assistant" | "user"; content: string };

type CandidateProfile = {
  fullName: string;
  email: string;
  institution: string;
  yearCohort: string;
  aspiration: string;
  targetRole: string;
  resumeSummary: string;
  resumeSkills: string[];
  resumeProjects: { title: string; stack: string[]; impact: string }[];
};

export default function InterviewPage({ params }: { params: Promise<{ id: string; mode: string }> }) {
  const { id, mode } = use(params);
  const router = useRouter();
  const isTech = mode === "technical";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Press mic to start");
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);

  const messagesRef = useRef<Msg[]>([]);
  const doneRef = useRef(false);
  const voiceSessionId = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const profileRef = useRef<CandidateProfile | null>(null);

  useEffect(() => {
    // Load candidate profile from localStorage
    try {
      const stored = localStorage.getItem("taledge:demo-profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        profileRef.current = parsed;
        setProfile(parsed);
      }
    } catch {}

    // Start interview
    setElapsed(0);
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);

    return () => {
      clearInterval(timer);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  async function askNext(history: Msg[]) {
    setLoading(true);
    setVoiceStatus("AI is thinking...");

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: id,
          role: profileRef.current?.targetRole || (isTech ? "Full-stack Software Engineer" : "Behavioural assessment"),
          resumeSummary: getResumeContext(),
          history,
          mode: isTech ? "technical" : "behavioural",
        }),
      });

      const data = await response.json();
      const question = data.question || "Tell me about your most challenging project.";

      const updated = [...history, { role: "assistant" as const, content: question }];
      messagesRef.current = updated;
      setMessages(updated);
      setLoading(false);

      // Speak the question
      speakText(question);
 } catch (e) {
      console.error("Failed to get question:", e);
      setLoading(false);
      setVoiceStatus("Error. Try again.");
    }
  }

  function getResumeContext(): string {
    const p = profileRef.current;
    if (!p) return "";

    let context = `Candidate: ${p.fullName}\n`;
    context += `Target Role: ${p.targetRole}\n`;
    context += `Institution: ${p.institution} (${p.yearCohort})\n`;
    context += `Aspiration: ${p.aspiration}\n`;

    if (p.resumeSummary) {
      context += `\nResume Summary:\n${p.resumeSummary}\n`;
    }

    if (p.resumeSkills && p.resumeSkills.length > 0) {
      context += `\nSkills: ${p.resumeSkills.join(", ")}\n`;
    }

    if (p.resumeProjects && p.resumeProjects.length > 0) {
      context += `\nProjects:\n`;
      p.resumeProjects.forEach((proj, i) => {
        context += `${i + 1}. ${proj.title} (${proj.stack?.join(", ") || "N/A"})\n`;
        if (proj.impact) context += `   Impact: ${proj.impact}\n`;
      });
    }

    return context;
  }

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) {
      setVoiceStatus("Tap mic to answer");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => {
      if (!doneRef.current) {
        setVoiceStatus("Tap mic to answer");
      }
    };
    window.speechSynthesis.speak(utterance);
  }

  async function startRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Speech recognition not supported in this browser");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        setVoiceStatus(`Heard: "${interim}"...`);
      }
    };

    recognition.onend = () => {
      setRecording(false);
      if (finalTranscript.trim()) {
        submitAnswer(finalTranscript.trim());
      } else {
        setVoiceStatus("No speech detected. Try again.");
      }
    };

    recognition.onerror = () => {
      setRecording(false);
      setVoiceStatus("Try speaking again");
    };

    recognitionRef.current = recognition;
    setRecording(true);
    setVoiceStatus("Listening... speak now!");
    recognition.start();

    // Auto-stop after 45 seconds
    setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, 45000);
  }

  function submitAnswer(answer: string) {
    const history = messagesRef.current;
    const userCount = history.filter(m => m.role === "user").length;

    const updated = [...history, { role: "user" as const, content: answer }];
    messagesRef.current = updated;
    setMessages(updated);

    if (userCount >= 3) {
      setDone(true);
      setVoiceStatus("Interview complete!");
      return;
    }

    setVoiceStatus("Getting next question...");
    setTimeout(() => {
      askNext(updated);
    }, 800);
  }

  function submitText() {
    if (!draft.trim() || loading) return;
    submitAnswer(draft.trim());
    setDraft("");
  }

  function finishInterview() {
    router.push(`/student/${id}/fit-score`);
  }

  const m = Math.floor(elapsed / 60);
  const s = String(elapsed % 60).padStart(2, "0");
  const userTurns = messages.filter(m => m.role === "user").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/student/${id}`} className="text-gray-500 hover:text-gray-700">
              ← Back
            </Link>
            <span className="font-semibold text-gray-900">
              {isTech ? "Technical" : "Behavioural"} Interview
            </span>
          </div>
          <div className="flex items-center gap-3">
            {profile && (
              <span className="text-sm text-gray-600 hidden sm:inline">
                {profile.fullName} · {profile.targetRole}
              </span>
            )}
            <span className="text-sm text-gray-600">{m}:{s}</span>
            <span className="px-2 py-1 bg-gray-100 rounded text-xs">{userTurns}/4</span>
          </div>
        </div>
      </header>

      {/* Chat */}
      <main className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[60vh] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-500 animate-pulse">
                  AI is thinking...
                </div>
              </div>
            )}
          </div>

          {done ? (
            <div className="p-4 border-t border-gray-200 bg-green-50">
              <p className="text-green-700 font-medium">🎉 Interview Complete!</p>
              <p className="text-sm text-green-600 mt-1">Your responses have been recorded. The AI is generating your personalized report.</p>
              <button onClick={finishInterview} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                View Results →
              </button>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-200">
              {/* Voice controls */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={recording ? () => recognitionRef.current?.stop() : startRecording}
                  disabled={loading}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    recording
                      ? "bg-red-500 animate-pulse"
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white disabled:opacity-50`}
                >
                  {recording ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
                <div>
                  <div className="text-sm font-medium text-gray-700">{voiceStatus}</div>
                  <div className="text-xs text-gray-500">or type your answer below</div>
                </div>
              </div>

              {/* Text input */}
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={2}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={submitText}
                  disabled={!draft.trim() || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Candidate info sidebar */}
        {profile && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Interview Context</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Candidate:</span>
                <span className="ml-2 font-medium text-gray-900">{profile.fullName}</span>
              </div>
              <div>
                <span className="text-gray-500">Target Role:</span>
                <span className="ml-2 font-medium text-gray-900">{profile.targetRole}</span>
              </div>
              {profile.resumeSkills && profile.resumeSkills.length > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-500">Skills:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.resumeSkills.slice(0, 8).map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}