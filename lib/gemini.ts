export const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
export const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL || "gemini-2.5-flash-native-audio-preview-12-2025";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GenerateOptions = {
  parts?: GeminiPart[];
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: "application/json" | "text/plain";
};

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || "";
}

export function extractJson(text: string): any | null {
  const trimmed = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateGeminiContent(
  apiKey: string,
  prompt: string,
  options: GenerateOptions = {}
) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  // Convert Gemini parts to a single string for OpenRouter simplicity
  const additionalText = (options.parts || [])
    .filter(p => "text" in p)
    .map(p => (p as { text: string }).text)
    .join("\n");
  
  const fullContent = additionalText ? prompt + "\n" + additionalText : prompt;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://taledge.com",
        "X-Title": "TalEdge Platform"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: fullContent }],
        temperature: options.temperature ?? 0.2,
        ...(options.responseMimeType === "application/json"
            ? { response_format: { type: "json_object" } }
            : {})
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw Object.assign(new Error("AI service unavailable via OpenRouter."), {
      status: response.status,
      upstreamError: errorText.slice(0, 300),
    });
  }

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return { text, model: GEMINI_TEXT_MODEL };
}

export async function generateGeminiJson<T = any>(
  apiKey: string,
  prompt: string,
  options: GenerateOptions = {}
): Promise<{ parsed: T; text: string; model: string }> {
  const result = await generateGeminiContent(apiKey, prompt, {
    ...options,
    responseMimeType: "application/json",
  });
  const parsed = extractJson(result.text);
  if (!parsed) {
    throw Object.assign(new Error("Gemini returned unparseable JSON."), {
      status: 422,
      rawPreview: result.text.slice(0, 300),
    });
  }
  return { parsed: parsed as T, ...result };
}
