import { NextResponse } from "next/server";
import { GEMINI_LIVE_MODEL, getGeminiApiKey } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Gemini Live service is not configured." },
      { status: 503 }
    );
  }

  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/ephemeralTokens:create?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            uses: 1,
            expireTime,
            newSessionExpireTime,
            liveConnectConstraints: {
              model: GEMINI_LIVE_MODEL,
              config: {
                responseModalities: ["AUDIO"],
                systemInstruction: {
                  parts: [
                    {
                      text:
                        "You are Taledge's structured interview voice agent. Ask concise interview questions, wait for answers, and keep the interview professional.",
                    },
                  ],
                },
              },
            },
            httpOptions: { apiVersion: "v1alpha" },
          },
        }),
      }
    );

    if (!response.ok) {
      const upstreamError = await response.text();
      return NextResponse.json(
        {
          ok: false,
          error: "Gemini Live token service is unavailable.",
          upstreamStatus: response.status,
          upstreamError: upstreamError.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const token = await response.json();
    return NextResponse.json({
      ok: true,
      token: token.name,
      expireTime: token.expireTime || expireTime,
      newSessionExpireTime: token.newSessionExpireTime || newSessionExpireTime,
      model: GEMINI_LIVE_MODEL,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Gemini Live token service is unavailable.",
        detail: e?.message?.slice(0, 200),
      },
      { status: 500 }
    );
  }
}
