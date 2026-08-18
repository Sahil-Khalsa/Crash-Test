export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function callJSON<T>(
  model: string,
  prompt: string,
  schema: object
): Promise<Result<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is not set" };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      }
    );

    if (!res.ok) {
      return { ok: false, error: `Gemini ${model} returned ${res.status}` };
    }

    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      return { ok: false, error: "Gemini response had no text part" };
    }

    return { ok: true, data: JSON.parse(text) as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
