const GEMINI_MODEL = "gemini-flash-latest";
const GMI_URL = "https://api.gmi-serving.com/v1/chat/completions";
const GMI_MODEL = "meta-llama/Llama-3.3-70B-Instruct";

async function runGemini(systemPrompt: string, input: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "[execution error] GEMINI_API_KEY is not set";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: input }] }],
        }),
      }
    );

    if (!res.ok) {
      return `[execution error] target model returned ${res.status}`;
    }

    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text === "string") return text;

    const finishReason = body?.candidates?.[0]?.finishReason;
    const blockReason = body?.promptFeedback?.blockReason;
    if (finishReason === "SAFETY" || blockReason) {
      return "[The model declined to generate a response, citing its own safety filtering.]";
    }

    return "[execution error] empty response from target model";
  } catch (err) {
    return `[execution error] ${err instanceof Error ? err.message : String(err)}`;
  }
}

type GMIResult = { ok: true; text: string } | { ok: false };

async function runGMI(systemPrompt: string, input: string): Promise<GMIResult> {
  const apiKey = process.env.GMI_API_KEY;

  try {
    const res = await fetch(GMI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GMI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input },
        ],
      }),
    });

    if (!res.ok) return { ok: false };

    const body = await res.json();
    const text = body?.choices?.[0]?.message?.content;
    return typeof text === "string" ? { ok: true, text } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function runTarget(systemPrompt: string, input: string): Promise<string> {
  if (process.env.GMI_API_KEY) {
    const result = await runGMI(systemPrompt, input);
    if (result.ok) return result.text;
    // GMI unreachable or errored — fall back to Gemini Flash silently, per ARCHITECTURE.md's degradation table
  }
  return runGemini(systemPrompt, input);
}
