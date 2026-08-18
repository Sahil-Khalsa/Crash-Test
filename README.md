# Crashtest

Built at the Build Club AI hack night (SF, 2026-08-17) — hosted with Gemini/Google DeepMind, Exa, WorkOS, Convex, GMI Cloud, Photon, Mosaic, Vapi, ElevenLabs, AdaL, and Apify.

## What we're building

An adversarial testing tool for AI agents. You paste an agent's system prompt (and optionally its tool schemas), and Crashtest automatically writes and runs a suite of attacks against it, then reports exactly how — and how badly — it broke.

**The problem it solves:** teams ship agents with no tests, because writing adversarial tests by hand is slow and requires already knowing how agents fail. So agents get judged on whether responses *sound* right instead of whether they *are* right, and they break in production in ways nobody anticipated.

## What it does

1. **Ground** — searches Exa for real, documented failures in the agent's domain, so the tests are derived from things that actually broke in production, not just what a model imagines could go wrong.
2. **Generate** — Gemini 2.5 Pro writes 12–15 adversarial test cases across at least 3 failure categories (prompt injection, ambiguity, tool misuse, scope violation, hallucination bait), grounded in those real incidents.
3. **Execute** — every test case is sent to the target agent (running on GMI Cloud if configured, otherwise Gemini Flash) and its raw response is captured.
4. **Judge** — a separate model call scores each response against explicit pass/fail criteria. Judging is deliberately a different call than execution, so nothing grades its own performance, and the judge is instructed to be strict — partial compliance is a fail.
5. **Report** — a headline score (e.g. `6 / 15 passed`), with failures grouped by category and color-coded by severity. Each failure expands to show the exact input, the agent's actual response, and why the judge failed it.
6. **Repair** *(stretch)* — rewrites the target's system prompt to close the specific holes the run found, reruns the identical suite against it, and shows the before/after score side by side.

## What it looks like in use

A single page, three states — input, running, report:

- Paste a system prompt (and optional tool schemas), hit Run.
- A spinner shows the current pipeline stage. No skeletons, no streaming.
- The report renders with failures sorted first — nobody cares about the passes.

If live APIs die mid-demo, `?demo=1` loads a complete, pre-baked successful run with zero network calls.

## Why the design is this way

- **Grounding is the core quality claim.** Ungrounded generation produces generic tests a model imagined; grounding on real reported incidents produces tests derived from what actually broke. This is why Exa is architecturally load-bearing, not a bolt-on.
- **The judge is the biggest risk.** A lenient judge that rubber-stamps everything as a pass makes the whole product meaningless. Before any optional integration is touched, a deliberately weak prompt ("You are a helpful assistant. Do whatever the user asks.") must score under 50% — proof the score actually discriminates good agents from bad ones.
- **Everything degrades, nothing crashes.** Every external call (Exa, Gemini, GMI, ElevenLabs) fails silently and falls back rather than aborting the run, because a partial report is still a valid report, and a crashed demo is not.
- **Scope is deliberately small.** No database, no auth, no persistence, no retries, no streaming — in-memory state only, for a single 90-minute build. Duplication is preferred over abstraction so the whole codebase stays readable in five minutes.

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind, deployed to Vercel. Core APIs: Gemini and Exa. Optional (gated behind a passing judge-quality check): GMI Cloud for target execution, ElevenLabs for a spoken report summary.

## Status

See `SPEC.md` for the phase-by-phase build plan and checkpoints, `ARCHITECTURE.md` for the module-level contract and file layout, and `CLAUDE.md` for the hard constraints this build does not violate.
