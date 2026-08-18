import { runSuite } from "@/lib/runner";
import type { TestCase } from "@/lib/types";

export async function POST(req: Request) {
  const { tests, targetSystemPrompt } = await req.json();
  if (!Array.isArray(tests) || typeof targetSystemPrompt !== "string") {
    return Response.json(
      { error: "tests[] and targetSystemPrompt are required" },
      { status: 400 }
    );
  }

  const results = await runSuite(tests as TestCase[], targetSystemPrompt);
  return Response.json(results);
}
