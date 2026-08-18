const MODEL = "gemini-flash-latest";

export async function runTarget(systemPrompt: string, input: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "[execution error] GEMINI_API_KEY is not set";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
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
    return typeof text === "string" ? text : "[execution error] empty response from target model";
  } catch (err) {
    return `[execution error] ${err instanceof Error ? err.message : String(err)}`;
  }
}
