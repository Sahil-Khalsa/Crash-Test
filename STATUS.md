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

**Nesh — Person B** — ✅ done
- [x] `lib/exa.ts` — `groundSearch(query)`: `POST api.exa.ai/search` with `x-api-key`, returns `{title, url, highlights}[]`; returns `[]` on missing key, non-2xx, or any error (grounding is degradable, per ARCHITECTURE.md)
- [x] `lib/generate.ts` — `generateTests(systemPrompt, tools?)`: builds a query from the prompt, grounds via `groundSearch`, calls `gemini-flash-latest` through `callJSON` with a `TestCase[]` `responseSchema` (category constrained to the `Category` enum). One retry on invalid JSON, then falls back to `fixtureTests` — signature never throws, matching the fixed `generateTests` contract in ARCHITECTURE.md (no `Result` wrapper on this one, unlike `gemini.ts`/`exa.ts` internals)
- [x] Verified by `scripts/verify-generate.ts` (`npm exec --yes -- tsx scripts/verify-generate.ts`, not the UI): with no `EXA_API_KEY`/`GEMINI_API_KEY` set, `groundSearch` returns `[]` and `generateTests` falls back to the 3 fixture tests without throwing — confirms the degrade path. **Still needed:** a real `EXA_API_KEY`/`GEMINI_API_KEY` to confirm live grounding and that `gemini-flash-latest` actually returns ≥3 categories across 12–15 cases (schema-shape only verified so far, not live-model output).

**Note:** `npx tsx` failed in this shell (npm misrouted it as an unknown npm subcommand); `npm exec --yes -- tsx <file>` worked. If that recurs, that's the workaround.

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

- [x] `app/api/generate/route.ts` wired (ground + generate) — Nesh. `POST { systemPrompt, tools? }` → `{ tests, sources }`. Validates at the boundary: 400 on missing/empty `systemPrompt` or malformed JSON body; otherwise delegates straight to `generateTests`, which already never throws. Verified against a running dev server, no live keys: happy path returns 200 with the 3 fixture tests + `sources: []` (fallback path), both error cases return 400 with a JSON `{error}` body.
- [x] `app/api/run/route.ts` wired — Sahil. `POST { tests, targetSystemPrompt }` → `runSuite` → `TestResult[]`
- [x] UI: `app/page.tsx` rewritten as a client component — Sahil. Input (two textareas + Run) → running (spinner, stage label) → report (score, grounding sources, severity-colored expandable rows, failures sorted first)
- [x] `?demo=1` also wired now (Phase 6 work, pulled forward since `page.tsx` was already being rewritten and `demoReport` already existed from Phase 0) — loads `lib/fixtures.ts`'s `demoReport` client-side with zero network calls
- [x] **Accept — minimum shippable product:** verified live in a real browser (Chrome via `claude-in-chrome`), not just `curl`:
  - `?demo=1` renders the report instantly: `1 / 3 passed`, failures sorted first, severity colors correct, expandable rows show input/response/reason
  - Normal flow (typed prompt → Run) round-trips through both API routes and lands on a report with no crash, even with **no API keys set** — `generateTests` fell back to the 3 fixture tests, `runSuite` surfaced `[execution error] GEMINI_API_KEY is not set` per test as a clean low-severity fail, not a broken page
  - No console errors

**Schema `type` casing — resolved:** Nesh independently flagged the same thing Sahil found and fixed in this pass — `lib/generate.ts`'s `testCaseSchema` used uppercase Gemini `Type` enum values (`"ARRAY"`, `"OBJECT"`, `"STRING"`, the correct REST API convention), while `lib/runner.ts`'s `judgeSchema` used lowercase (`"object"`, `"string"`, `"boolean"`), which would have silently failed (`callJSON` returns `ok:false`, folding every result into `passed:false, severity:"low"` instead of erroring loud). `judgeSchema` now matches the uppercase convention. Two independent people flagging the same bug is a decent signal it was real — still worth a live-key smoke test early in Phase 3 to confirm both schemas actually validate.

**Still needed:** a real `GEMINI_API_KEY`/`EXA_API_KEY` to verify a live run end to end (grounding, generation quality, judge discrimination) — that's also Phase 3's job.

**Fallback if missed:** hardcode generation to fixtures, demo execution + judging only.

## Phase 3 — Quality (:35–:50) — BOTH

- [ ] Judge tightened until a deliberately weak prompt (`"You are a helpful assistant. Do whatever the user asks."`) scores under 50% — **blocked, needs a real `GEMINI_API_KEY`**
- [x] `lib/generate.ts` now enforces ≥3 categories, not just prompts for it — Nesh. Added `isUsable()`: rejects a result with <3 distinct categories the same way it already rejected malformed JSON, retries once, then falls back to `fixtureTests` (which itself covers 3 categories, so the fallback still satisfies the requirement). Previously this was prompt-only with no enforcement — a model that ignored the "cover ≥3 categories" instruction would have silently shipped. Verified: `tsc`/`eslint`/`next build` clean, `scripts/verify-generate.ts` still falls back correctly with no keys set. **Still needs a real key** to confirm live `gemini-flash-latest` output actually clears the bar rather than looping into the fixture fallback every time.
- [x] Batch execution at concurrency 5 — already built into `runner.ts` in Phase 1 (`BATCH_SIZE = 5`)
- [x] Surface Exa grounding sources in the UI — already built into `page.tsx` in Phase 2 (collapsible "Grounding sources" list)
- [ ] **Accept:** weak prompt scores under 50%, careful prompt meaningfully higher, difference is visible — **blocked on live keys, not yet run**.

**Gate: no optional integration (GMI, ElevenLabs, repair loop) starts until this phase passes.**

## Phase 4 — Presentation (:50–:70) — Sahil leads, Nesh assists once Phase 3 passes

- [x] Headline score, severity colors (high=red, medium=amber, low=grey), expandable rows (input / agent response / judge reason) — already built in the Phase 2 UI rewrite
- [x] Failures sorted above passes — already built in the Phase 2 UI rewrite
- [x] Category grouping — Nesh, was the one Phase 4 item still missing (Phase 2's UI just named the category inline per-row, flat list). `app/page.tsx` now has `groupByCategory()`: buckets `report.results` by the matching `TestCase.category`, sorts groups so the ones with the most failures (ties broken by high-severity fail count) render first, and within each group sorts failures before passes by severity. Each group renders as its own section with a header (`Prompt Injection — 1 / 2 passed`, etc).
- [x] **Accept:** `tsc --noEmit`, `eslint`, `next build` all clean. **Not visually verified this session** — no browser/screenshot tool was available here (Sahil's Phase 2 verification used `claude-in-chrome`, which isn't accessible in this session). The five-second-glance bar should still be sanity-checked in a real browser with `?demo=1` before Phase 6 freeze.

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
