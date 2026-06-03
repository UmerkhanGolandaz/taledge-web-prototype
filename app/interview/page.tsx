"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface TranscriptMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: number;
}

interface InterviewState {
  candidateName: string;
  targetRole: string;
  experienceLevel: string;
  resumeText: string;
  skills: string[];
  phase: "details" | "resume" | "interview" | "complete";
}

export default function InterviewPage() {
  const router = useRouter();
  const [state, setState] = useState<InterviewState>({
    candidateName: "",
    targetRole: "",
    experienceLevel: "",
    resumeText: "",
    skills: [],
    phase: "details",
  });
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<any>(null);
  const interimRef = useRef("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const elapsedRef = useRef(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
    };
  }, []);

  // Start camera
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera not available");
    }
  }

  // Voice: toggle recording
  function toggleRecording() {
    if (isRecording) {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      setVoiceStatus("");
    } else {
      startVoiceRecording();
    }
  }

  async function startVoiceRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Speech recognition not supported — use text input");
      return;
    }

    // Stop previous session
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }

    interimRef.current = "";
    setInterimText("");
    setVoiceStatus("");

    // Request mic stream
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setVoiceStatus("Microphone access denied");
      return;
    }
    micStreamRef.current = stream;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const part = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          interimRef.current += part + " ";
        } else {
          interim = part;
        }
      }
      setInterimText(interim);
      if (interim) setVoiceStatus(`Listening: "${interim}"...`);
    };

    recognition.onend = () => {
      // Check if we actually have content — if recognition stopped without content, it may be a browser interruption
      const transcript = interimRef.current.trim();

      if (!transcript) {
        // User said nothing before stopping — just reset
        setIsRecording(false);
        setVoiceStatus("No speech detected — try again");
        setInterimText("");
        interimRef.current = "";
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(t => t.stop());
          micStreamRef.current = null;
        }
        return;
      }

      // We have transcribed text — auto-submit
      setIsRecording(false);
      setVoiceStatus("");
      setInterimText("");

      // Put transcript in textarea so user sees it
      setAnswer(transcript);

      // Stop mic stream
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }

      // Submit after short pause so user sees their words
      setTimeout(() => {
        submitAnswerFromVoice(transcript);
      }, 600);
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      setVoiceStatus("");
      setInterimText("");
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      if (event.error === "no-speech") {
        setVoiceStatus("No speech heard — try again");
      } else if (event.error === "not-allowed" || event.error === "permission-denied") {
        setVoiceStatus("Microphone denied — allow in browser settings");
      } else {
        setVoiceStatus("Mic error — type your answer instead");
      }
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    setVoiceStatus("Listening... speak now!");

    try {
      recognition.start();
    } catch {
      setIsRecording(false);
      setVoiceStatus("Could not start mic — try again");
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      return;
    }

    // Auto-stop after 60s
    autoStopTimerRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, 60000);
  }

  // Voice submission — adds to transcript and moves to next question
  function submitAnswerFromVoice(voiceText: string) {
    const userAnswer = voiceText.trim();
    if (!userAnswer) return;

    setTranscript(t => [...t, {
      id: `a-${Date.now()}`,
      role: "user",
      content: userAnswer,
      timestamp: Date.now(),
    }]);

    if (questionCount >= 7) {
      setTimeout(() => generateReport(userAnswer), 2000);
      return;
    }

    setTimeout(() => askQuestion(userAnswer), 2500);
  }

  // Step 1: Save candidate details
  function saveDetails(name: string, role: string, experience: string) {
    setState(s => ({ ...s, candidateName: name, targetRole: role, experienceLevel: experience, phase: "resume" }));
  }

  // Step 2: Upload and analyze resume
  async function analyzeResume(file: File) {
    setIsLoading(true);
    setError("");

    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer))));

      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyzeResume",
          pdfBase64: base64,
          filename: file.name,
          targetRole: state.targetRole,
        }),
      });

      const data = await response.json();

      // Proceed even if analysis partially failed
      const resumeText = data.resumeText || "";
      const skills = Array.isArray(data.skills) && data.skills.length > 0 ? data.skills : ["General"];

      setState(s => ({
        ...s,
        resumeText,
        skills,
        phase: "interview",
      }));

      // Start camera + timer
      await startCamera();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setElapsed(0);
      timerIntervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

      // Start first question
      await askQuestion("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Generate question
  async function askQuestion(previousAnswer: string) {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generateQuestion",
          candidateName: state.candidateName,
          targetRole: state.targetRole,
          experienceLevel: state.experienceLevel,
          resumeText: state.resumeText,
          skills: state.skills,
          previousAnswers: transcript.filter(m => m.role === "user").map(m => m.content),
          questionCount: questionCount,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate question");
      }

      const question = data.question;
      setCurrentQuestion(question);
      setQuestionCount(c => c + 1);

      setTranscript(t => [...t, {
        id: `q-${Date.now()}`,
        role: "assistant",
        content: question,
        timestamp: Date.now(),
      }]);

      speak(question);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Submit answer (text)
  function submitAnswer() {
    const textarea = document.querySelector<HTMLTextAreaElement>("#interview-answer");
    const userAnswer = (textarea?.value.trim() || answer.trim());
    if (!userAnswer) return;

    if (textarea) textarea.value = "";
    setAnswer("");

    setTranscript(t => [...t, {
      id: `a-${Date.now()}`,
      role: "user",
      content: userAnswer,
      timestamp: Date.now(),
    }]);

    if (questionCount >= 7) {
      setTimeout(() => generateReport(userAnswer), 2000);
      return;
    }

    setTimeout(() => askQuestion(userAnswer), 2500);
  }

  // Generate final report
  async function generateReport(lastAnswer?: string) {
    setIsLoading(true);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generateReport",
          candidateName: state.candidateName,
          targetRole: state.targetRole,
          transcript: transcript,
          resumeText: state.resumeText,
          skills: state.skills,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Failed to generate report");

      localStorage.setItem("interview:report", JSON.stringify(data.report));
      setState(s => ({ ...s, phase: "complete" }));

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Text to speech
  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } catch {
      // Non-critical
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // === STEP 1: DETAILS ===
  if (state.phase === "details") {
    return <DetailsStep onNext={saveDetails} />;
  }

  // === STEP 2: RESUME ===
  if (state.phase === "resume") {
    return (
      <ResumeStep
        targetRole={state.targetRole}
        onAnalyze={analyzeResume}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  // === STEP 3: INTERVIEW COMPLETE ===
  if (state.phase === "complete") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Complete!</h1>
          <p className="text-gray-500 mt-2">Duration: {formatTime(elapsedRef.current)}</p>
          <p className="text-gray-500">{questionCount} questions answered</p>
          <button
            onClick={() => router.push("/interview/report")}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            View AI Report
          </button>
        </div>
      </div>
    );
  }

  // === STEP 3: INTERVIEW ===
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
            <div className="text-base font-semibold text-gray-900">TalEdge</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm">{formatTime(elapsed)}</span>
            <span className="px-2 py-1 bg-gray-100 rounded text-sm">Q{questionCount}/8</span>
            {isLoading && <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm animate-pulse">Thinking...</span>}
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700">{error}</div>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Chat */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[60vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">{transcript.filter(m => m.role === "user").length}/8 answered</span>
              <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(transcript.filter(m => m.role === "user").length / 8) * 100}%` }} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {transcript.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-500 animate-pulse">AI is thinking...</div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-4 space-y-2">
              <textarea
                id="interview-answer"
                placeholder="Type your answer..."
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && submitAnswer()}
                disabled={isLoading}
              />
              <button
                onClick={submitAnswer}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Answer
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-3">Camera</div>
            <div className="relative rounded-lg overflow-hidden bg-gray-900 aspect-[4/3]">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  REC
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-3">Voice Input</div>
            <button
              onClick={toggleRecording}
              disabled={isLoading}
              className={`w-full rounded-xl py-3 flex items-center justify-center gap-2 font-semibold text-sm transition-colors ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {isRecording ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Stop Recording
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Use Voice
                </>
              )}
            </button>
            {voiceStatus && (
              <div className="mt-2 text-xs text-gray-600">{voiceStatus}</div>
            )}
            {interimText && (
              <div className="mt-1 text-xs text-blue-600 font-medium">{interimText}</div>
            )}
            <div className="mt-2 text-xs text-gray-400">Tap to speak your answer</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Candidate</div>
            <div className="text-sm font-medium">{state.candidateName || "—"}</div>
            <div className="text-xs text-gray-500">{state.targetRole || "—"}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Skills</div>
            <div className="flex flex-wrap gap-1">
              {state.skills.length > 0 ? state.skills.slice(0, 8).map(skill => (
                <span key={skill} className="px-2 py-0.5 bg-gray-100 rounded text-xs">{skill}</span>
              )) : (
                <span className="text-xs text-gray-400">No skills detected</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// === DETAILS STEP ===
function DetailsStep({ onNext }: { onNext: (name: string, role: string, experience: string) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");

  const roles = ["Full-stack Developer", "Backend Engineer", "Frontend Engineer", "Data Engineer", "DevOps Engineer"];
  const experiences = ["Fresher", "1-3 years", "3-5 years", "5+ years"];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Start Interview</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Role</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${role === r ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-blue-300"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
            <div className="grid grid-cols-2 gap-2">
              {experiences.map(e => (
                <button
                  key={e}
                  onClick={() => setExperience(e)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${experience === e ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-blue-300"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNext(name, role, experience)}
            disabled={!name.trim() || !role || !experience}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            Continue to Resume Upload
          </button>
        </div>
      </div>
    </div>
  );
}

// === RESUME STEP ===
function ResumeStep({
  targetRole,
  onAnalyze,
  isLoading,
  error,
}: {
  targetRole: string;
  onAnalyze: (file: File) => void;
  isLoading: boolean;
  error: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type === "application/pdf") {
      setFile(f);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Resume</h1>
        <p className="text-gray-500 mb-6">Targeting: <span className="font-medium text-gray-700">{targetRole || "—"}</span></p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 mb-4 text-sm">
            {error}
          </div>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById("resume-file")?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <input id="resume-file" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />

          {file ? (
            <div>
              <div className="text-gray-900 font-medium text-sm">{file.name}</div>
              <div className="text-gray-400 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="mt-2 text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">📄</div>
              <div className="text-sm text-gray-600">Drop PDF here or click to browse</div>
              <div className="text-xs text-gray-400 mt-1">PDF files only</div>
            </div>
          )}
        </div>

        <button
          onClick={() => file && onAnalyze(file)}
          disabled={!file || isLoading}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </span>
          ) : "Analyze Resume & Start Interview"}
        </button>
      </div>
    </div>
  );
}