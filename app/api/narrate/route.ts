import { narrateReport } from "@/lib/narrate";
import type { RunReport } from "@/lib/types";

export async function POST(req: Request) {
  let report: RunReport;
  try {
    report = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const audio = await narrateReport(report);
  if (!audio) {
    return Response.json({ error: "narration unavailable" }, { status: 404 });
  }

  return new Response(new Uint8Array(audio), { headers: { "Content-Type": "audio/mpeg" } });
}
