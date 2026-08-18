import { generateTests } from "@/lib/generate";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { systemPrompt, tools } = (body ?? {}) as { systemPrompt?: unknown; tools?: unknown };

  if (typeof systemPrompt !== "string" || systemPrompt.trim().length === 0) {
    return Response.json({ error: "systemPrompt is required" }, { status: 400 });
  }

  const result = await generateTests(systemPrompt, typeof tools === "string" ? tools : undefined);
  return Response.json(result);
}
