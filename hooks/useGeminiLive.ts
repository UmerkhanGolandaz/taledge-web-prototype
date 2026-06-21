"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { authedFetch } from "@/lib/api-client";

export type LiveContext = {
  candidateName?: string;
  role?: string;
  mode?: "technical" | "behavioural" | "dnla" | "final";
  track?: "placement" | "exam";
  resumeSummary?: string;
  dnlaSummary?: string;
  priorInterviews?: string;
};

export type LiveMessage = { role: "ai" | "user"; text: string };

/**
 * Gemini Live (realtime native-audio) interviewer client.
 *
 * - Mints an ephemeral token server-side (/api/gemini/live-token), then opens the
 *   BidiGenerateContent WebSocket with it.
 * - Sends a setup with the HD prebuilt voice + interviewer system prompt + input/
 *   output audio transcription, then triggers the AI to speak first.
 * - Streams the AI's native-audio out (24kHz PCM) and the candidate's mic in, and
 *   accumulates BOTH sides' transcriptions into `messages` for scoring.
 */
export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueue = useRef<Int16Array[]>([]);
  const isPlaying = useRef(false);
  // Accumulators for the in-flight turn's streamed transcription text.
  const aiTurnRef = useRef("");
  const userTurnRef = useRef("");

  const playNextAudio = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || audioQueue.current.length === 0) {
      isPlaying.current = false;
      setAiSpeaking(false);
      return;
    }
    isPlaying.current = true;
    setAiSpeaking(true);
    const pcm = audioQueue.current.shift()!;
    const buffer = ctx.createBuffer(1, pcm.length, 24000); // Gemini Live output is 24kHz
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768.0;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => playNextAudio();
    src.start();
  }, []);

  const startMicrophone = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
    if (mediaStreamRef.current) return; // already capturing
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
    processor.onaudioprocess = (e) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const f32 = e.inputBuffer.getChannelData(0);
      const i16 = new Int16Array(f32.length);
      for (let i = 0; i < f32.length; i++) {
        const s = Math.max(-1, Math.min(1, f32[i]));
        i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const bytes = new Uint8Array(i16.buffer);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: btoa(bin) }] } }));
    };
  }, []);

  const connect = useCallback(async (context: LiveContext = {}) => {
    setError(null);
    try {
      const res = await authedFetch("/api/gemini/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.token) {
        setError("Could not start the live interviewer. Please retry.");
        return false;
      }
      const { token, model, voice, systemInstruction } = data;

      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?access_token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(
          JSON.stringify({
            setup: {
              model: model.startsWith("models/") ? model : `models/${model}`,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Aoede" } } },
              },
              systemInstruction: { parts: [{ text: systemInstruction || "You are a professional interviewer." }] },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          })
        );
        // Nudge the interviewer to greet and ask the first question.
        ws.send(
          JSON.stringify({
            clientContent: {
              turns: [{ role: "user", parts: [{ text: "I'm ready. Please begin the interview." }] }],
              turnComplete: true,
            },
          })
        );
      };

      ws.onmessage = async (event) => {
        let payload: any;
        try {
          const raw = event.data instanceof Blob ? await event.data.text() : event.data;
          payload = JSON.parse(raw);
        } catch {
          return;
        }

        if (payload.setupComplete) {
          startMicrophone().catch(() => setError("Microphone access is required for the live interview."));
          return;
        }

        const sc = payload.serverContent;
        if (!sc) return;

        // Streamed transcriptions (accumulate per side, commit on turn end).
        if (sc.outputTranscription?.text) aiTurnRef.current += sc.outputTranscription.text;
        if (sc.inputTranscription?.text) userTurnRef.current += sc.inputTranscription.text;

        // Native-audio chunks → play.
        const parts = sc.modelTurn?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            const inline = part.inlineData;
            if (inline?.data && typeof inline.mimeType === "string" && inline.mimeType.startsWith("audio/")) {
              const binary = atob(inline.data);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              audioQueue.current.push(new Int16Array(bytes.buffer));
              if (!isPlaying.current) playNextAudio();
            }
          }
        }

        if (sc.turnComplete) {
          const userText = userTurnRef.current.trim();
          const aiText = aiTurnRef.current.trim();
          userTurnRef.current = "";
          aiTurnRef.current = "";
          setMessages((prev) => {
            const next = [...prev];
            if (userText) next.push({ role: "user", text: userText });
            if (aiText) next.push({ role: "ai", text: aiText });
            return next;
          });
        }
      };

      ws.onerror = () => setError("The live connection had an error.");
      ws.onclose = () => setIsConnected(false);
      return true;
    } catch (e) {
      setError("Could not connect to the live interviewer.");
      return false;
    }
  }, [playNextAudio, startMicrophone]);

  const disconnect = useCallback(() => {
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    try { audioContextRef.current?.close(); } catch {}
    audioContextRef.current = null;
    audioQueue.current = [];
    isPlaying.current = false;
    setIsConnected(false);
    setAiSpeaking(false);
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return { isConnected, aiSpeaking, error, messages, connect, disconnect, startMicrophone };
}
