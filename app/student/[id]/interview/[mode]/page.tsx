"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Camera, AlertTriangle, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Starting interview...");
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [liveStatus, setLiveStatus] = useState<"checking" | "ready" | "missing" | "error">("checking");
  const [liveModel, setLiveModel] = useState("");
  
  const [warnings, setWarnings] = useState(0);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [showWarningOverlay, setShowWarningOverlay] = useState(false);
  const [forceTerminated, setForceTerminated] = useState(false);
  const [isCodingMode, setIsCodingMode] = useState(false);

  const messagesRef = useRef<Msg[]>([]);
  const doneRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const profileRef = useRef<CandidateProfile | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const warningsCountRef = useRef(0);

  async function prepareGeminiLive() {
    setLiveStatus("checking");
    try {
      const response = await fetch("/api/gemini/live-token", { method: "POST" });
      const data = await response.json();
      if (response.status === 503) {
        setLiveStatus("missing");
        return;
      }
      if (!response.ok || !data.ok) {
        setLiveStatus("error");
        return;
      }
      setLiveModel(data.model || "gemini-live");
      setLiveStatus("ready");
    } catch {
      setLiveStatus("error");
    }
  }

  // Warning system for tab switching / loss of focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (doneRef.current) return;
      if (document.hidden) {
        warningsCountRef.current += 1;
        setWarnings(warningsCountRef.current);
      } else {
        const w = warningsCountRef.current;
        if (w >= 3) {
          setForceTerminated(true);
          setDone(true);
          setVoiceStatus("Interview terminated due to proctoring violations.");
        } else if (w > 0) {
          setShowWarningOverlay(true);
          setTimeout(() => setShowWarningOverlay(false), 5000);
          setVoiceStatus(`Focus warning ${w}/3 recorded.`);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Initialization & First Question
  useEffect(() => {
    let cancelled = false;
    let p: CandidateProfile | null = null;
    try {
      const stored = localStorage.getItem("taledge:workspace-profile");
      if (stored) {
        p = JSON.parse(stored);
        profileRef.current = p;
        setProfile(p);
      }
    } catch {}

    const timer = setInterval(() => setElapsed(e => e + 1), 1000);

    async function startInterview() {
      setLoading(true);
      setVoiceStatus("Preparing first question...");
      try {
        const response = await fetch("/api/interview/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: id,
            mode: isTech ? "technical" : "behavioural",
            role: p?.targetRole || (isTech ? "Software Engineer" : "Candidate"),
            resumeSummary: p?.resumeSummary || "",
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data?.error || "Could not start the interview.");
        }
        if (cancelled) return;
        const first = String(data.firstQuestion || "Tell me about your strongest relevant experience.");
        const initialMessages = [{ role: "assistant" as const, content: first }];
        setSessionId(data.sessionId);
        messagesRef.current = initialMessages;
        setMessages(initialMessages);
        persistTranscript(initialMessages);
        setLoading(false);
        speakText(first);
      } catch (e: any) {
        if (cancelled) return;
        setLoading(false);
        setVoiceStatus(e?.message || "Interview could not be started.");
      }
    }

    void startInterview();
    void prepareGeminiLive();
    void enableWebcam();

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis?.cancel();
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  function persistTranscript(nextMessages: Msg[]) {
    try {
      localStorage.setItem(
        `taledge:interview:${id}:${isTech ? "technical" : "behavioural"}`,
        JSON.stringify(nextMessages)
      );
    } catch {
      /* local transcript persistence is best-effort */
    }
  }

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) {
      setVoiceStatus("Tap mic or type to answer");
      return;
    }
    window.speechSynthesis.cancel();
    
    // Attempt to use a natural English voice
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const goodVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Premium") || v.name.includes("Samantha"));
    if (goodVoice) utterance.voice = goodVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      if (!doneRef.current) {
        setVoiceStatus("Tap mic or type to answer");
      }
    };
    window.speechSynthesis.speak(utterance);
    setVoiceStatus("Question is playing...");
  }

  async function startRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Speech recognition not supported in this browser. Please type.");
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
        setVoiceStatus("No speech detected. Try again or type.");
      }
    };

    recognition.onerror = () => {
      setRecording(false);
      setVoiceStatus("Microphone error. Try speaking again.");
    };

    recognitionRef.current = recognition;
    setRecording(true);
    setVoiceStatus("Listening... speak now!");
    recognition.start();

    // Auto-stop after 60 seconds
    setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, 60000);
  }

  async function enableWebcam() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera capture is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setWebcamEnabled(true);
    } catch {
      setCameraError("Camera permission was not granted. You can continue with text or microphone input.");
    }
  }

  async function submitAnswer(answer: string) {
    if (!sessionId || loading || done) return;
    const history = messagesRef.current;
    const updated = [...history, { role: "user" as const, content: answer }];
    messagesRef.current = updated;
    setMessages(updated);
    persistTranscript(updated);
    setLoading(true);
    setVoiceStatus("Recording response...");

    try {
      const response = await fetch("/api/interview/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text: answer }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Could not record your answer.");
      }

      if (data.isDone) {
        setDone(true);
        setLoading(false);
        setVoiceStatus("Interview complete.");
        persistTranscript(updated);
        return;
      }

      const nextQuestion = String(data.nextQuestion || "");
      const nextMessages = nextQuestion
        ? [...updated, { role: "assistant" as const, content: nextQuestion }]
        : updated;
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      persistTranscript(nextMessages);
      setLoading(false);
      if (nextQuestion) {
        speakText(nextQuestion);
      } else {
        setVoiceStatus("Tap mic or type to answer");
      }
    } catch (e: any) {
      setLoading(false);
      setVoiceStatus(e?.message || "Network error while recording answer.");
    }
  }

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (isCodingMode) {
      const words = val.trim().split(/\s+/).filter(Boolean);
      if (words.length > 100 && val.length > draft.length) {
        return;
      }
    }
    setDraft(val);
  };

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
  
  const wordCount = draft.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500/30 relative z-0">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 bg-slate-50 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      {/* Top Header */}
      <header className="bg-white/40 backdrop-blur-2xl border-b border-white/40 sticky top-0 z-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/30 group">
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">TalEdge AI Interviewer</h1>
              <p className="text-xs font-medium text-slate-500">{isTech ? "Technical Assessment" : "Behavioural Assessment"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold shadow-lg shadow-slate-900/20 border border-slate-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              PROCTORING ACTIVE
            </div>
            <div
              className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold md:flex ${
                liveStatus === "ready"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : liveStatus === "missing"
                  ? "border-amber-100 bg-amber-50 text-amber-700"
                  : liveStatus === "error"
                  ? "border-rose-100 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
              title={liveModel || "Gemini Live"}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  liveStatus === "ready"
                    ? "bg-emerald-500"
                    : liveStatus === "missing"
                    ? "bg-amber-500"
                    : liveStatus === "error"
                    ? "bg-rose-500"
                    : "bg-slate-400 animate-pulse"
                }`}
              />
              {liveStatus === "ready"
                ? "Gemini Live ready"
                : liveStatus === "missing"
                ? "Gemini key needed"
                : liveStatus === "error"
                ? "Live unavailable"
                : "Checking Live"}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${warnings > 0 ? 'bg-red-500 text-white border-red-600 shadow-md shadow-red-500/30' : 'bg-red-50 text-red-700 border-red-100'}`}>
              <AlertTriangle className="w-4 h-4" />
              Warnings: {warnings}/3
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {m}:{s}
            </div>
            <div className="text-xs font-bold text-slate-400">
              Q {Math.min(userTurns + 1, 4)} / 4
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showWarningOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-red-950/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-4 border-red-500">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight">Proctoring Alert</h2>
              <p className="text-slate-600 font-medium mb-6">
                You have switched away from the interview tab. This is a strict violation of our proctoring policy.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl font-bold">
                <AlertTriangle className="w-5 h-5" />
                Warning {warnings} of 3
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: context and optional camera */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Proctoring Window */}
          <div className="bg-white/40 backdrop-blur-2xl rounded-3xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 overflow-hidden relative group">
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <div className="px-3 py-1.5 bg-black/60 backdrop-blur-xl rounded-xl text-[10px] font-bold text-white flex items-center gap-2 uppercase tracking-wider border border-white/10 shadow-lg">
                <span className={`w-2 h-2 rounded-full ${webcamEnabled ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-500'}`} />
                <Camera className="w-3 h-3 text-white/70" />
                Camera {webcamEnabled ? "Active" : "Optional"}
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden group">
              <div className={`absolute inset-0 border-[3px] rounded-2xl z-10 pointer-events-none transition-colors duration-500 ${webcamEnabled ? 'border-emerald-500/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]' : 'border-transparent'}`} />
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="w-full aspect-[4/3] object-cover bg-slate-900/90"
              />
            </div>
            {!webcamEnabled && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-sm p-4 text-center rounded-2xl m-2 border border-white/5">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-1">
                  <Camera className="w-5 h-5 text-white/50" />
                </div>
                <div className="text-sm font-semibold text-white">Camera not enabled</div>
                <button
                  type="button"
                  onClick={enableWebcam}
                  className="rounded-xl bg-indigo-500 hover:bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-colors shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                >
                  Enable camera
                </button>
                {cameraError && (
                  <div className="max-w-xs text-[11px] font-medium text-white/70">{cameraError}</div>
                )}
              </div>
            )}
          </div>

          {/* Context Card */}
          <div className="bg-white/40 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Candidate Profile
            </h3>
            {profile ? (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Name</div>
                  <div className="text-sm font-medium text-slate-800">{profile.fullName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Role</div>
                  <div className="text-sm font-medium text-slate-800">{profile.targetRole}</div>
                </div>
                {profile.resumeSkills?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Detected Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.resumeSkills.slice(0, 6).map(s => (
                        <span key={s} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400">No uploaded profile yet. The interview will use the selected role context.</div>
            )}
          </div>
        </div>

        {/* Right Column: Chat Interface */}
        <div className="lg:col-span-8 flex flex-col bg-white/60 backdrop-blur-3xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/80 overflow-hidden relative">
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-3xl px-6 py-4 text-[15px] leading-relaxed shadow-[0_4px_20px_rgb(0,0,0,0.04)] ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm border border-indigo-400/30"
                      : "bg-white/80 backdrop-blur-md text-slate-800 border border-white/80 rounded-bl-sm"
                  }`}>
                    {msg.role === "assistant" && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-2 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Interview Engine
                      </div>
                    )}
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/80 backdrop-blur-md border border-white/80 rounded-3xl rounded-bl-sm px-6 py-4 text-slate-500 flex items-center gap-3 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
                    <span className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                    </span>
                    <span className="text-sm font-medium">Generating next question...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatBottomRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-6 bg-white/70 backdrop-blur-xl border-t border-white/60 z-10 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)]">
            {done ? (
              forceTerminated ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 rounded-2xl p-6 border border-red-200 text-center"
                >
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-red-900 mb-2">Interview Terminated</h3>
                  <p className="text-sm text-red-700 mb-4">Your interview was terminated due to repeated proctoring violations (tab switching). This has been reported.</p>
                  <button 
                    onClick={finishInterview} 
                    className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 w-full md:w-auto"
                  >
                    Exit Interview
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 text-center"
                >
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-900 mb-2">Interview Concluded</h3>
                  <p className="text-sm text-emerald-700 mb-4">Your responses have been successfully recorded. Continue to the Fit Score workspace when ready.</p>
                  <button 
                    onClick={finishInterview} 
                    className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 w-full md:w-auto"
                  >
                    Continue to Fit Score
                  </button>
                </motion.div>
              )
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2 mb-2 border-b border-slate-100 pb-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {voiceStatus}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCodingMode(false)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${!isCodingMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      Voice / Text
                    </button>
                    <button
                      onClick={() => setIsCodingMode(true)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${isCodingMode ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      <FileText className="w-3 h-3" /> Coding Task
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3 items-end">
                  {!isCodingMode && (
                    <button
                      onClick={recording ? () => recognitionRef.current?.stop() : startRecording}
                      disabled={loading}
                      className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                        recording
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                      }`}
                    >
                      {recording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                  )}
                  
                  <div className={`flex-1 bg-white/60 backdrop-blur-md border rounded-2xl flex ${isCodingMode ? 'flex-col p-3' : 'items-center p-2'} transition-all shadow-inner ${isCodingMode ? 'border-red-300 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10 min-h-[160px]' : 'border-white/80 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10'}`}>
                    {isCodingMode && (
                       <div className="flex items-center justify-between px-2 pt-1 pb-2 mb-2 border-b border-red-100">
                         <span className="text-[10px] font-black text-red-600 uppercase tracking-wider flex items-center gap-1">
                           <ShieldAlert className="w-3 h-3" /> Strict Proctoring Enforced (No Paste)
                         </span>
                         <span className={`text-[10px] font-bold ${wordCount > 90 ? 'text-red-500' : 'text-slate-400'}`}>
                           {wordCount} / 100 words
                         </span>
                       </div>
                    )}
                    <textarea
                      value={draft}
                      onChange={handleDraftChange}
                      onPaste={(e) => {
                        if (isCodingMode) {
                          e.preventDefault();
                          alert("Pasting is strictly disabled for coding questions.");
                        }
                      }}
                      placeholder={isCodingMode ? "Type your code here. Maximum 100 words. Pasting is blocked." : (recording ? "Listening to your voice..." : "Type your code or answer manually here...")}
                      disabled={recording}
                      rows={isCodingMode ? 6 : 1}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey && !isCodingMode) {
                          e.preventDefault();
                          submitText();
                        }
                      }}
                      className={`flex-1 bg-transparent px-3 py-2 resize-none text-sm font-medium focus:outline-none disabled:opacity-50 ${isCodingMode ? 'text-slate-900 font-mono leading-relaxed' : 'text-slate-800'} placeholder:text-slate-400 ${!isCodingMode && 'min-h-[44px] max-h-[120px]'}`}
                    />
                    {isCodingMode ? (
                      <div className="flex justify-end mt-2 px-2">
                        <button
                          onClick={submitText}
                          disabled={!draft.trim() || loading || recording}
                          className="shrink-0 h-10 px-6 text-white rounded-xl flex items-center gap-2 justify-center transition-colors disabled:opacity-50 bg-red-600 hover:bg-red-700 font-bold shadow-md shadow-red-600/20"
                        >
                          Submit Code
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={submitText}
                        disabled={!draft.trim() || loading || recording}
                        className="shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600"
                      >
                        <Send className="w-4 h-4 ml-0.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
