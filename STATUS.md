# STATUS.md — Crashtest Build Tracker

Two-person split per `ARCHITECTURE.md` / `SPEC.md`. Check boxes as you go — this file is the source of truth for who owns what and what's done. Swap roles if it fits your strengths better, just update the table first.

## Roles

| | Owns | Domain |
|---|---|---|
| **Sahil — Person A** | `lib/runner.ts`, `lib/target.ts`, `app/page.tsx`, `lib/fixtures.ts` | Execution, judging, UI |
| **Nesh — Person B** | `lib/exa.ts`, `lib/generate.ts` | Grounding, test generation |

Built together in Phase 0, before splitting: `lib/types.ts`, `lib/gemini.ts`.

---

## Phase 0 — Setup (:00–:08) — BOTH

- [x] Next.js app scaffolded (`create-next-app@15`, TS, Tailwind v4, App Router)
- [x] `lib/types.ts` written — full contract (`Category`, `Severity`, `TestCase`, `TestResult`, `RunReport`, `Source`)
- [x] `lib/gemini.ts` — `callJSON<T>(model, prompt, schema)`, returns `Result<T>` (never throws, per CLAUDE.md conventions). `target.ts`'s Gemini branch and `narrate.ts` need freeform text, not JSON — they'll call the Gemini REST endpoint directly rather than through `callJSON`, so this file stays the single function ARCHITECTURE.md describes.
- [x] `lib/fixtures.ts` — 3 hardcoded `TestCase` + 3 `TestResult`, plus a composed `demoReport: RunReport` for `?demo=1` (Phase 6) so that doesn't need rework later
- [x] Placeholder `app/page.tsx` and stub `POST` handlers in the three `app/api/*/route.ts` so `next build` (what Vercel runs) is green, not just `next dev`
- [x] **Accept:** `npm run dev` serves a page (verified: 200, renders). `npx next build` compiles clean. Both import `TestCase` from `lib/types.ts`.
- [ ] Fill in real values in `.env.local` (`GEMINI_API_KEY`, `EXA_API_KEY` — template already created, gitignored)

**→ Split here. Do not touch each other's files until :35.**

## Phase 1 — Halves in isolation (:08–:20)

**Nesh — Person B** — 🔄 in progress
- [ ] `lib/exa.ts` — returns highlights for a hardcoded query
- [ ] `lib/generate.ts` — returns schema-valid `TestCase[]` for a hardcoded system prompt
- [ ] Verified by a script, not the UI

**Sahil — Person A** — ✅ done
- [x] `lib/target.ts` — `runTarget(systemPrompt, input)`, Gemini Flash branch only for now (returns `Promise<string>`, never throws — errors come back as `"[execution error] ..."` text so `runner.ts` can fail that test without a special-case type)
- [x] `lib/runner.ts` — `runSuite(tests, targetSystemPrompt)`: executes + judges each `TestCase` against a hardcoded target prompt → `TestResult[]`. Batches in chunks of 5 (Phase 3 requirement, built in now). Judge prompt lifts the four "detect failure, not be charitable" rules from `ARCHITECTURE.md` verbatim.
- [x] `app/page.tsx` — async Server Component, calls `runSuite` directly against the 3 fixture tests + a hardcoded airline-support-agent prompt, renders pass/fail per test. `export const dynamic = "force-dynamic"` so `next build` doesn't fire real API calls at build time.

**Accept:** each half runs standalone and prints correct output. Neither depends on the other yet.
**Verified (Sahil's half):** `npx next build` green, `npm run dev` returns 200 and renders without a real `GEMINI_API_KEY` set — degrades to `[execution error] GEMINI_API_KEY is not set` per test instead of crashing. **Still needed:** a real key to confirm the judge actually discriminates pass/fail (that's also Phase 3's job, but worth a spot check here).
**Fallback if missed:** whichever half is behind drops to fixtures permanently; that person moves to helping the other.

**Note — model change:** `CLAUDE.md`'s Models table now specifies `gemini-flash-latest` for all three Gemini roles (generation, target execution, judging), not `gemini-2.5-pro`/`gemini-2.5-flash` as originally written. `MODEL`/`JUDGE_MODEL` constants in `lib/target.ts` and `lib/runner.ts` already use it. `gemini-flash-latest` is an alias not yet verified against the live API — the first real run with a key is the check; if it 404s, that's the model name, not the request shape.

**Contract note:** `ARCHITECTURE.md`'s error-handling table says execute/judge failures should be "errored"/"inconclusive" and excluded from the score denominator, but `TestResult` has no such state. Resolved by folding errors into `passed: false, severity: "low"` with the error in `reason` — counted in the denominator. `lib/types.ts` was not changed. If errors turn out to be common rather than the rare case once live, raise it with Nesh as a contract amendment at the Phase 2 sync point, not before.

## Phase 2 — Integration (:20–:35) — BOTH

- [ ] `app/api/generate/route.ts` wired (ground + generate)
- [ ] `app/api/run/route.ts` wired (execute + judge)
- [ ] UI: paste prompt → generate → run → render
- [ ] **Accept — minimum shippable product:** one complete run from a pasted prompt to a rendered score, live APIs, no manual steps.

**Fallback if missed:** hardcode generation to fixtures, demo execution + judging only.

## Phase 3 — Quality (:35–:50) — BOTH

- [ ] Judge tightened until a deliberately weak prompt (`"You are a helpful assistant. Do whatever the user asks."`) scores under 50%
- [ ] Confirm ≥3 categories appear in a typical run
- [ ] Batch execution at concurrency 5
- [ ] Surface Exa grounding sources in the UI
- [ ] **Accept:** weak prompt scores under 50%, careful prompt meaningfully higher, difference is visible.

**Gate: no optional integration (GMI, ElevenLabs, repair loop) starts until this phase passes.**

## Phase 4 — Presentation (:50–:70) — Sahil leads, Nesh assists once Phase 3 passes

- [ ] Headline score, category grouping, severity colors (high=red, medium=amber, low=grey), expandable rows (input / agent response / judge reason)
- [ ] Failures sorted above passes
- [ ] **Accept:** a stranger looking at the screen for five seconds understands the agent failed and roughly how.

## Phase 5 — Optional, only if ahead of schedule, in this order

- [ ] **5b — GMI Cloud** (:50–:65) — Sahil, fills the GMI branch of `lib/target.ts`. **Accept:** full run completes with `GMI_API_KEY` set, and still completes when unset.
- [ ] **5c — ElevenLabs** (:65–:70, only if Phase 4 is done) — Nesh, `lib/narrate.ts` + play button. **Accept:** button plays audio; report renders identically when key is missing.
- [ ] **5 — Repair loop** (only if both above done, do not start after :60) — Nesh, `app/api/repair/route.ts`. **Accept:** reruns the identical suite, shows both scores + delta.

**Cut order if behind:** narration → repair loop → GMI branch → Exa UI display → category grouping → tool schema input → live generation. Never cut: execution, judging, the score, `?demo=1`.

## Phase 6 — Freeze (:70–:80) — BOTH

- [ ] `?demo=1` loads a complete run from fixtures, zero network calls — **test it**
- [ ] Screen-record a full successful live run
- [ ] Commit, deploy, open deployed URL on the presenting laptop
- [ ] **No code changes after this point regardless of what anyone notices**

## Phase 7 — Rehearsal (:80–:90) — BOTH

- [ ] Two full run-throughs out loud, timed. Not read silently.
