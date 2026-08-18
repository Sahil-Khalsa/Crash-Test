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

- [ ] Next.js app scaffolded (`create-next-app`, TS, Tailwind)
- [ ] `lib/types.ts` written — full contract (`Category`, `Severity`, `TestCase`, `TestResult`, `RunReport`)
- [ ] `lib/gemini.ts` — `callJSON(model, prompt, schema)` + a plain-text sibling (needed by `target.ts`'s Gemini branch and `narrate.ts`, which return freeform text, not JSON)
- [ ] `lib/fixtures.ts` stubbed — 3 hardcoded `TestCase` + 3 `TestResult`
- [ ] **Accept:** `npm run dev` serves a page. Both import `TestCase` from `lib/types.ts`.

**→ Split here. Do not touch each other's files until :35.**

## Phase 1 — Halves in isolation (:08–:20)

**Nesh — Person B**
- [ ] `lib/exa.ts` — returns highlights for a hardcoded query
- [ ] `lib/generate.ts` — returns schema-valid `TestCase[]` for a hardcoded system prompt
- [ ] Verified by a script, not the UI

**Sahil — Person A**
- [ ] `lib/target.ts` — `runTarget(systemPrompt, input)`, Gemini Flash branch only for now
- [ ] `lib/runner.ts` — executes + judges the 3 fixture `TestCase`s against a hardcoded target prompt → `TestResult[]`
- [ ] `app/page.tsx` — renders those results

**Accept:** each half runs standalone and prints correct output. Neither depends on the other yet.
**Fallback if missed:** whichever half is behind drops to fixtures permanently; that person moves to helping the other.

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
