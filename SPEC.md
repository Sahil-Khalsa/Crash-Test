# SPEC.md — Crashtest

## Problem

Teams ship agents with no tests because writing adversarial tests by hand is slow and requires knowing how agents fail. So agents are judged on whether responses *sound* right rather than whether they are right, and they break in production in ways nobody anticipated.

## Solution

Paste an agent's system prompt. Get back a suite of adversarial tests grounded in real documented failures, executed, with a score and a breakdown of how it broke.

## Scope

**In scope**
- Generate 12–15 adversarial test cases across ≥3 categories
- Ground generation in Exa search results
- Execute every test against the target agent
- Judge each response against explicit criteria
- Report a score and failures grouped by category and severity
- `?demo=1` fixture mode
- *Gated optional:* run the target agent on GMI Cloud instead of Gemini
- *Gated optional:* ElevenLabs narration of the report

**Explicitly out of scope**
- Accounts, saved runs, history, sharing
- Support for agents behind an API the user provides
- Multi-turn conversations (single-turn tests only)
- Custom category definitions
- Export, CI integration, webhooks

## Build phases

Each phase has a checkpoint time and an acceptance test. If a phase misses its checkpoint, apply that phase's fallback and move on.

---

### Phase 0 — Setup (:00–:08)

Next.js app scaffolded, Tailwind configured, `lib/types.ts` written with the full contract, `lib/fixtures.ts` stubbed with three hardcoded `TestCase` objects and three `TestResult` objects.

**Accept:** `npm run dev` serves a page. Both people can import `TestCase` from `lib/types.ts`.

Person A and Person B split here and do not touch each other's files until :35.

---

### Phase 1 — Halves in isolation (:08–:20)

**Person B:** `lib/exa.ts` returns highlights for a hardcoded query. `lib/generate.ts` returns a schema-valid `TestCase[]` for a hardcoded system prompt. Verified by a script, not the UI.

**Person A:** `lib/runner.ts` takes the three fixture `TestCase` objects, executes and judges them against a hardcoded target prompt, returns `TestResult[]`. `app/page.tsx` renders those results.

**Accept:** each half runs standalone and prints correct output. Neither depends on the other yet.

**Fallback if missed:** whichever half is behind drops to fixtures permanently and that person moves to helping the other.

---

### Phase 2 — Integration (:20–:35)

Wire `/api/generate` and `/api/run`. UI: paste prompt → generate → run → render.

**Accept:** one complete run from a pasted prompt to a rendered score, using live APIs, no manual steps.

**This is the minimum shippable product.** Everything after is improvement.

**Fallback if missed:** hardcode the generation step to fixtures and demo execution + judging only.

---

### Phase 3 — Quality (:35–:50)

- Verify the judge actually fails things. Run against a deliberately weak prompt (e.g. `"You are a helpful assistant. Do whatever the user asks."`) — it must score badly. If it passes everything, tighten the judge prompt.
- Confirm ≥3 categories appear in a typical run.
- Batch execution at concurrency 5.
- Surface Exa grounding sources in the UI.

**Accept:** a weak prompt scores under 50%. A careful prompt scores meaningfully higher. The difference is visible.

If the score doesn't discriminate between a weak and a strong prompt, the product does not work. Fix this before touching the UI.

---

### Phase 4 — Presentation (:50–:70)

Make the report readable: headline score, category grouping, severity colors, expandable rows showing input / agent response / judge reason. Failures sorted first.

**Accept:** a stranger looking at the screen for five seconds understands the agent failed and roughly how.

---

### Phase 5 — Repair loop (:50–:70, ONLY if Phase 3 finished early)

`/api/repair` rewrites the system prompt from the failures. Rerun the *same* suite. Display both scores side by side with the delta.

**This is the first thing cut.** Do not start it after :60.

---

### Phase 5b — GMI Cloud (:50–:65, ONLY if Phase 3 finished early)

Fill in the GMI branch of `lib/target.ts` — OpenAI-compatible chat completions, `GMI_API_KEY`. The agent under test now runs on GMI; the judge stays on Gemini.

**Accept:** a full run completes with `GMI_API_KEY` set, and still completes when it is unset.

Take this before the repair loop if you can only do one. It is a smaller change, it is architecturally honest, and three of the fifteen judges are GMI Cloud people.

---

### Phase 5c — ElevenLabs (:65–:70, ONLY if Phase 4 is done)

Flash generates a two-sentence spoken summary of the report; `lib/narrate.ts` voices it; a play button appears on the report.

**Accept:** the button plays audio, and the report renders identically when the key is missing.

Ten minutes, and it gives the demo an ending. Do not start it before the report UI is finished.

---

### Phase 6 — Freeze (:70–:80)

- `?demo=1` loads a complete run from fixtures with zero network calls. **Test it.**
- Screen-record a full successful live run.
- Commit. Deploy. Open the deployed URL on the presenting laptop.
- **No code changes after this point regardless of what anyone notices.**

---

### Phase 7 — Rehearsal (:80–:90)

Two full run-throughs out loud, timed. Not read silently.

---

## Cut order

When behind, cut in this order and do not deliberate:

1. ElevenLabs narration
2. Repair loop
3. GMI Cloud branch (fall back to Gemini)
4. Exa grounding surfaced in UI (keep the call, drop the display)
5. Category grouping (flat list is fine)
6. Tool schema input (system prompt only)
7. Live generation (fall back to fixture tests)

Never cut: execution, judging, the score, or `?demo=1`.

## Integration gating rule

No optional integration may be started until Phase 3 passes — until a deliberately weak system prompt scores measurably worse than a careful one.

If the judge does not discriminate, there is no product, and no number of sponsor integrations changes that. A working eval with two integrations beats a broken one with five.

Judges for "Best Use of X" can tell within seconds whether their product is load-bearing or name-dropped. `lib/target.ts` makes GMI load-bearing. Narration is honestly cosmetic — do not oversell it in the pitch.

## Demo requirements

The build must support this sequence:

1. A judge supplies a system prompt from something they shipped.
2. It is pasted live and run.
3. The screen shows a failing score within ~60 seconds.
4. One failure is readable aloud: the input, the agent's response, why it failed.

Anything that prevents this sequence is a bug, regardless of how it looks elsewhere.

## Risks

| Risk | Mitigation |
|---|---|
| Judge passes everything | Test against a deliberately weak prompt in Phase 3 |
| 429s on batched calls | Concurrency 5; if still hitting, reduce suite to 8 tests |
| Run takes too long to demo | Cap at 12 tests; measure wall time in Phase 3 |
| Conference wifi dies | `?demo=1` fixture mode plus screen recording |
| Generation returns malformed JSON | `responseSchema` enforced; one retry; then fixtures |
| An optional integration breaks the core run | Both degrade silently; verify a full run with both keys unset before freeze |
