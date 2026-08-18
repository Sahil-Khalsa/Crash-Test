# CLAUDE.md — Crashtest

## What this is

Crashtest generates an adversarial test suite for any AI agent, runs it, and reports how the agent broke.

Input: a target agent's system prompt (and optionally its tool schemas).
Output: 12–15 generated test cases, executed, with a pass/fail score and a failure taxonomy.

## Hard constraints — do not violate

- **This is a 90-minute hackathon build.** Ship the happy path. Do not build for scale.
- **No database.** All state is in-memory / React state. No Postgres, no Redis, no Convex, no Prisma.
- **No auth.** No login, no users, no sessions.
- **No persistence between page loads.** Refresh wipes state. This is fine and intended.
- **NEVER use localStorage or sessionStorage.**
- **Core external APIs: Google Gemini and Exa.** These two must work before anything else is added.
- **Optional integrations are gated.** GMI Cloud and ElevenLabs may be added *only* after Phase 3 in SPEC.md passes. Do not add them earlier, do not add any others at all.
- **Single Next.js app.** No separate backend service. API routes only.

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind
- API routes under `app/api/`
- Deploy target: Vercel
- Env vars: `GEMINI_API_KEY`, `EXA_API_KEY` required; `GMI_API_KEY`, `ELEVENLABS_API_KEY` optional. All server-side only, never exposed to the client.
- Optional integrations must degrade silently. If `GMI_API_KEY` is absent, execution falls back to Gemini Flash. If `ELEVENLABS_API_KEY` is absent, the audio button does not render. Neither absence may break a run.

## Models

| Purpose | Model | Why |
|---|---|---|
| Test generation | `gemini-flash-latest` | Free tier, called once |
| Target execution | GMI Cloud if key present, else `gemini-flash-latest` | Called 15x, needs speed and cheap tokens |
| Judging | `gemini-flash-latest` | Called 15x, needs speed |
| Report narration (optional) | ElevenLabs `eleven_flash_v2_5` | One call, end of run |

`gemini-flash-latest` is used for all three Gemini roles (free-tier access). Everywhere below that references `gemini-2.5-pro` or `gemini-2.5-flash`, read it as `gemini-flash-latest`.

The judge always stays on Gemini. Only the *target execution* call moves to GMI — the thing being tested changes provider, the thing doing the testing does not.

All Gemini calls that return structured data MUST use `generationConfig.responseMimeType: "application/json"` with an explicit `responseSchema`. Never parse freeform text with regex.

## Conventions

- All type definitions live in `lib/types.ts`. Both halves of the codebase import from there. Do not duplicate types.
- Every external API call is wrapped in try/catch and returns a typed result, never throws to the caller.
- Concurrency cap of 5 on batched model calls. Higher rates 429.
- No comments explaining what code does. Comments only for non-obvious *why*.
- Prefer one file over three. This codebase should be small enough to read in five minutes.

## Definition of done for any task

The full pipeline runs end to end from the UI without a manual step. If a change breaks that, it isn't done.

## Things that will waste time — do not do them

- Retry/backoff logic. If a call fails, surface the error and move on.
- Streaming responses. Wait for the full result.
- Loading skeletons beyond a single spinner.
- Test framework setup. There are no unit tests in this project.
- Refactoring for reuse. Duplication is cheaper than abstraction here.
- Any package not already in `package.json` unless it is strictly required.

## Demo safety (build this at the end, do not skip)

A `?demo=1` query param must load a hardcoded, complete, successful run from `lib/fixtures.ts` with zero network calls. This is the fallback if live APIs fail during the presentation. It must be verified working before the build is frozen.
