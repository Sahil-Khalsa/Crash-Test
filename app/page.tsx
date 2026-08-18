"use client";

import { useEffect, useState } from "react";
import type { RunReport, TestCase, Source, Severity } from "@/lib/types";
import { demoReport } from "@/lib/fixtures";

type Stage = "input" | "generating" | "running" | "report";

const severityColor: Record<Severity, string> = {
  high: "text-red-400 border-red-800",
  medium: "text-amber-400 border-amber-800",
  low: "text-gray-400 border-gray-700",
};

export default function Home() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [tools, setTools] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [report, setReport] = useState<RunReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      setReport(demoReport);
      setStage("report");
    }
  }, []);

  async function handleRun() {
    setError(null);
    setStage("generating");
    try {
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, tools: tools.trim() || undefined }),
      });
      if (!genRes.ok) throw new Error(`generate failed: ${genRes.status}`);
      const { tests, sources } = (await genRes.json()) as {
        tests: TestCase[];
        sources: Source[];
      };

      setStage("running");
      const runRes = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tests, targetSystemPrompt: systemPrompt }),
      });
      if (!runRes.ok) throw new Error(`run failed: ${runRes.status}`);
      const results = await runRes.json();

      setReport({
        total: results.length,
        passed: results.filter((r: { passed: boolean }) => r.passed).length,
        results,
        tests,
        grounding_sources: sources,
      });
      setStage("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage("input");
    }
  }

  function reset() {
    setReport(null);
    setStage("input");
    setError(null);
  }

  return (
    <main className="min-h-screen bg-black text-white font-mono p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6">Crashtest</h1>

      {stage === "input" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Target agent system prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-sm"
              placeholder="Paste the system prompt of the agent you want to test..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tool schemas (optional)</label>
            <textarea
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              rows={4}
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-sm"
              placeholder="Optional: paste tool/function schemas..."
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleRun}
            disabled={!systemPrompt.trim()}
            className="bg-white text-black px-4 py-2 rounded disabled:opacity-40"
          >
            Run
          </button>
        </div>
      )}

      {(stage === "generating" || stage === "running") && (
        <div className="flex items-center gap-3 text-gray-400">
          <span className="inline-block w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
          <span>
            {stage === "generating" ? "Grounding + generating tests..." : "Executing + judging..."}
          </span>
        </div>
      )}

      {stage === "report" && report && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xl">
              {report.passed} / {report.total} passed
            </p>
            <button onClick={reset} className="text-sm text-gray-400 underline">
              Run another
            </button>
          </div>

          {report.grounding_sources.length > 0 && (
            <details className="text-sm text-gray-400">
              <summary className="cursor-pointer">
                Grounding sources ({report.grounding_sources.length})
              </summary>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {report.grounding_sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <ul className="space-y-3">
            {[...report.results]
              .sort((a, b) => Number(a.passed) - Number(b.passed))
              .map((r) => {
                const test = report.tests.find((t) => t.id === r.test_id);
                return (
                  <li key={r.test_id} className={`border rounded p-4 ${severityColor[r.severity]}`}>
                    <details>
                      <summary className="cursor-pointer flex items-center justify-between gap-4">
                        <span className="text-white">
                          {r.test_id}
                          {test ? ` · ${test.category}` : ""}
                        </span>
                        <span>{r.passed ? "PASS" : `FAIL (${r.severity})`}</span>
                      </summary>
                      <div className="mt-3 space-y-2 text-sm">
                        <p>
                          <span className="text-gray-500">Input:</span> {test?.input}
                        </p>
                        <p>
                          <span className="text-gray-500">Agent response:</span> {r.agent_response}
                        </p>
                        <p>
                          <span className="text-gray-500">Judge reason:</span> {r.reason}
                        </p>
                      </div>
                    </details>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </main>
  );
}
