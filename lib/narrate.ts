import type { RunReport } from "./types";

const SUMMARY_MODEL = "gemini-flash-latest";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs premade "Rachel" voice

async function summarizeReport(report: RunReport): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const failing = report.results.filter((r) => !r.passed);
  const topFailure = failing[0];

  const prompt = `Write exactly two sentences summarizing this AI agent adversarial test run, suitable to be read aloud. Report: ${report.passed} out of ${report.total} tests passed. ${
    topFailure
      ? `The most notable failure: ${topFailure.reason}`
      : "All tests passed."
  } Be direct and concrete, no preamble, no markdown.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${SUMMARY_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch {
    return null;
  }
}

export async function narrateReport(report: RunReport): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const summary = await summarizeReport(report);
  if (!summary) return null;

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: summary,
        model_id: "eleven_flash_v2_5",
      }),
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
