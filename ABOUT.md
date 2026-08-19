# Generation Reliability Fix — "Unexpected token 'A', "An error o"... is not valid JSON"

## Follow-up verification pass (second session on this bug)

A second pass re-verified this entire fix against the **current** code rather than trusting the write-up below on faith, per explicit instruction. Findings:

- **The previous fix is genuinely present and correct** — re-read (not re-recalled) `app/api/generate/route.ts` (has `maxDuration = 120`), `lib/http/parse-json-response.ts` (exists, correct), and `components/ai-studio/studio-workspace.tsx` (actually calls `parseJsonResponse`, no bare `response.json()` remains outside a comment). Confirmed via fresh `grep`/`Read`, not memory.
- **One real, related issue found and fixed this pass**: `lib/ai/carousel-planner.ts`, `story-planner.ts`, and `reel-planner.ts` all called Gemini with `maxOutputTokens: 8192` — a value that predates the prior session's own prompt-engineering change (`lib/ai/image-prompt-guidelines.ts`), which made every slide/frame/scene's `imageGenerationPrompt` a full structured paragraph instead of a one-liner. A large, verbose carousel (up to ~10 slides, each now with a much longer prompt) can plausibly approach or exceed 8192 tokens, truncating Gemini's JSON output mid-object. This already failed *safely* (the existing `JSON.parse` → `AIServiceError(502)` wrapping catches it, so it was never going to reproduce the "Unexpected token" bug specifically), but it's a real, avoidable generation-failure mode for exactly the longest pipeline — the same one in the reported repro. Fixed by raising all three to `16384`, matching the value `lib/ai/visual-prompt.ts` already uses for the identical reason (its own doc comment: *"many 250-600 word prompts... raises maxOutputTokens well above the other calls to avoid truncation"*) — reusing an existing, already-proven-necessary value rather than guessing a new one.
- **Precision correction on the `maxDuration` claim**: per Next.js's own bundled docs (`node_modules/next/dist/docs/.../maxDuration.md`): *"Deployment platforms can use `maxDuration` from the Next.js build output to add specific execution limits"* — it is a **request to the platform**, not a guarantee. This repo has no `.vercel` project link or plan-tier config checked in, so which Vercel plan is actually deployed cannot be determined from the codebase alone. `maxDuration = 120` will be honored up to whatever that plan allows (Vercel's well-known behavior is to clamp a higher requested value down — e.g. to 60s on Hobby) — but in every case, this is strictly better than the previous *unset* default (10s), regardless of which plan is deployed. Stated precisely rather than assumed.
- **Fresh live re-verification, zero quota spent**: ran the dev server again, entered the exact reported repro (same topic, Carousel, creativity 100%), and this time intercepted `/api/generate` with a *different* simulated failure shape than the first pass (an HTML 502 "Bad Gateway" page, `Content-Type: text/html`, vs. the first pass's plain-text 504) — confirmed the UI shows **"Generation unavailable" / "The server is temporarily unavailable. Please try again." / \[Try again\]**, never a raw parser error. Broadens confidence beyond the single failure shape tested previously.
- **Regression check, this pass**: `git status`/`git diff` scope confirms `components/creations/review-action-bar.tsx` (Canva), `lib/ai/image-providers/manager.ts` (Gemini→FLUX fallback), `lib/ai/image-prompt-guidelines.ts`/`visual-direction-schema.ts` (visualDirection/structured prompts), and the per-slide Carousel regenerate route were **not modified this pass** — only the three planner files' `maxOutputTokens` changed. Also directly re-confirmed (not assumed) that `lib/media-resolver/service.ts` still passes `slide.imageGenerationPrompt` straight through unmodified to `generateImage()`, and that `lib/ai/image-providers/manager.ts` still has its `FALLBACK_PROVIDER_ORDER = ["gemini", "flux"]` fallback loop intact.
- **Tests re-run this pass, all clean**: `npx tsc --noEmit`, `npx eslint . --ignore-pattern '.claude/**'`, `npm run build`, `npm run verify:json-response-handling` (7/7), `npm run verify:image-prompts` — all pass. No Gemini/image-generation quota consumed (only the client-side `window.fetch` mock and a local zero-network script were used).

**Files touched this pass**: `lib/ai/carousel-planner.ts`, `lib/ai/story-planner.ts`, `lib/ai/reel-planner.ts` (the `maxOutputTokens` fix), and this file. Nothing else.

---

This section documents a targeted debugging pass fixing a real Studio generation bug, on top of everything below (unchanged — this pass did not touch Canva, image-prompt engineering, the Gemini→FLUX fallback, or per-slide Carousel regeneration; see the Regression Check at the end of this section).

## 1. Root Cause

The client (`components/ai-studio/studio-workspace.tsx`'s `generate()`) called `await response.json()` **unconditionally** on the `fetch("/api/generate")` response, including on non-2xx responses. `/api/generate`'s own Route Handler was never the problem — every `return` in it is `Response.json(...)`, on both success and failure (verified by grepping every `return` in the file). The actual failure happens **upstream of that handler ever running at all**: `app/api/generate/route.ts` was the one route in this codebase's Gemini-heavy pipeline that never declared `export const maxDuration`, unlike every sibling route running a comparable-or-lighter pipeline (`app/api/creations/route.ts` and `.../regenerate/route.ts` both explicitly set `maxDuration = 120`, each with its own comment explaining exactly this risk). Without it, `/api/generate` silently inherited the platform's default Node.js serverless function timeout (10s on Vercel Hobby). A **Carousel** request runs *five* sequential Gemini text calls (Research → Planner → Visual Prompt → Instagram Content Generator, **plus** the Carousel Planner — one more stage than Post/Story/Reel), each with its own retry/backoff (500ms/1s/2s) and possible key-rotation/model-fallback (`lib/ai/gemini-provider.ts`) — genuinely capable of exceeding a 10-second ceiling even under only mild Gemini degradation, and creativity 100 plausibly produces larger, slower generations on top of that. When Vercel kills a function for exceeding its time limit, it returns **its own plain-text platform error page** — not anything this app ever wrote — which is exactly what produced a response body starting with "An error o..." that `response.json()` then threw a raw `SyntaxError` trying to parse.

## 2. Original Failure

A Vercel serverless-function execution-time-limit kill on `/api/generate`, most likely to occur for Carousel (the longest pipeline) at high creativity, before this route's own `try/catch` — which already correctly returns JSON for every *in-process* failure mode (Gemini unavailable, invalid key, quota, malformed JSON, Zod validation failure) — ever got a chance to run. This is an infrastructure-level failure, not a bug in the app's own error handling logic, which was already sound.

## 3. Fix

1. **`app/api/generate/route.ts`** — added `export const maxDuration = 120` (matching the exact value and reasoning already established in this codebase's other long-pipeline routes), directly reducing how often this route can be killed by the platform default.
2. **`lib/http/parse-json-response.ts`** (new) — a small, reusable, defensive response reader: checks `Content-Type` before attempting `response.json()`, and if the body isn't (or doesn't parse as) JSON, returns a controlled `{ ok: false, message, status }` result with a status-aware friendly message (e.g. 504 → "The request timed out. Please try again.") instead of ever throwing a raw `SyntaxError`. Never claims to know a specific upstream cause it doesn't actually have evidence for.
3. **`components/ai-studio/studio-workspace.tsx`** — `generate()` now calls `parseJsonResponse<GenerateApiResponse>(response)` and throws `parsed.message` when it fails, *before* the existing `!response.ok || !payload.data` check — which is otherwise completely unchanged.

This is a defense-in-depth fix, not a guess-and-hope one: (1) makes the actual timeout far less likely, and (2) makes the one place a fetch response gets parsed defensive against *any* future infrastructure-level non-JSON response (a proxy error, a different platform timeout shape, etc.), matching Phase 4's explicit instruction not to rely on the root-cause fix alone.

## 4. API Contract

Unchanged and re-confirmed, not redesigned: every Route Handler in this app already returns `Response.json(...)`/`NextResponse.json(...)` on both success (`{ data, ... }`) and failure (`{ error: "..." }`), with a meaningful HTTP status. No route's success/error shape was changed. What changed is purely how the **client** now reads a response that — for reasons outside any route handler's control — isn't actually one of those.

## 5. Frontend Handling

- A response whose `Content-Type` isn't `application/json`, or whose body fails to parse despite claiming to be JSON, now resolves to a clean `{ ok: false, message }` — never a thrown `SyntaxError`, never shown to the user.
- A response that *is* valid JSON (the normal case for every route in this app, success or failure) is read exactly as before — `parseJsonResponse` is a transparent passthrough for that case, verified by a dedicated test (Section 8).
- The user now sees "Generation unavailable" / a real, status-aware sentence ("The request timed out. Please try again." for the timeout case) with a "Try again" button — never "Unexpected token 'A', "An error o"... is not valid JSON".

## 6. Format Coverage

**Post, Carousel, Story, and Reel all share the exact same `/api/generate` Route Handler and the exact same client-side `generate()` function** — `contentTypes: [apiContentTypeByContentType[contentType]]` is the only per-format variation (confirmed by reading `studio-workspace.tsx` and `app/api/generate/route.ts` in full). There is no separate per-format generation endpoint or response parser to duplicate this fix across. Fixing this one shared route and one shared client function covers all four formats identically. Carousel remains the most exposed to the underlying timeout risk (five sequential stages vs. four for the others), which is exactly why it was the format in the reported repro.

## 7. Tests Run

- **`npx tsc --noEmit -p tsconfig.json`** — clean, zero errors.
- **`npx eslint . --ignore-pattern '.claude/**'`** — clean, zero errors/warnings.
- **`npm run build`** (`next build --webpack`) — compiled successfully; route table unchanged in shape (`/api/generate` still `ƒ`).
- **`npm run verify:json-response-handling`** (new script, zero network calls, uses only the standard `Response`/`Headers` globals) — 7/7 checks pass, including a test that constructs the *literal* reported failure shape (`"An error occurred with your deployment\n\nFUNCTION_INVOCATION_TIMEOUT"`, `Content-Type: text/plain`, status 504) and asserts `parseJsonResponse` resolves without throwing and without ever producing an "Unexpected token" message; plus JSON success, JSON error, malformed-but-declared-JSON, and HTML-error-page cases; plus a direct `generatedInstagramContentSchema.safeParse` check against both malformed and well-formed model output.
- **`npm run verify:image-prompts`** — still passes, unaffected (nothing this pass touched is in its dependency chain).
- **Live browser reproduction, zero Gemini quota spent**: started the real dev server, opened `/studio`, entered the *exact* reported input (Topic: "Suzuki Invicto vs Toyota Inova Hycross", Content type: Carousel, Creativity: 100%), and **patched `window.fetch` in the page itself** (via the browser automation tool's JS execution, not a test framework) to intercept only the `/api/generate` call and return the literal simulated platform-timeout response — every other request (page loads, etc.) passed through untouched. Clicked the real "Generate carousel" button and confirmed the real, running React component rendered **"Generation unavailable" / "The request timed out. Please try again." / \[Try again\]** — not the reported JSON error. This exercises the actual shipped code path end-to-end (real component state, real `parseJsonResponse` call, real error UI) without a single real network/Gemini call. `fetch` was restored immediately after.

## 8. Image Generation

**Zero image-generation (or any other Gemini) quota was consumed by this debugging pass.** The only "generation" attempted was the browser reproduction above, which never reached the network — `window.fetch` was intercepted client-side before the request left the page. No real Carousel, Post, Story, or Reel generation was run.

## 9. Regression Check

- **Canva blank-tab fix**: `components/creations/review-action-bar.tsx` was not touched this pass (confirmed via `git diff` scope) — `editInCanva()`'s no-pre-opened-tab flow, its popup-blocker fallback, and the already-linked-design reopen path are all exactly as they were.
- **Image prompt improvements** (`visualDirection`, structured `imageGenerationPrompt`, text-safe negative space, no-text/watermark/logo instruction): none of `lib/ai/image-prompt-guidelines.ts`, `lib/ai/visual-direction-schema.ts`, or any of the four planner prompt builders were touched this pass. `npm run verify:image-prompts` re-run and still passes.
- **Gemini → FLUX fallback** (`lib/ai/image-providers/manager.ts`): not touched this pass; `generateImage()`'s fallback-order loop is unchanged.
- **Per-slide Carousel regeneration**: `lib/carousel-plan/generate-media-for-plan.ts`, the `.../carousel/slides/[order]/regenerate` route, and `CarouselWorkspace`'s "Regenerate this slide" button are all untouched this pass.
- **Creation page redesign**: no Creation-page component was touched. This pass's only UI-facing change is inside the Studio's own `generate()` function.

## 10. Files Changed (this pass)

- `app/api/generate/route.ts` — added `maxDuration = 120` (+ explanatory comment).
- `lib/http/parse-json-response.ts` — new, the defensive response-reading helper.
- `components/ai-studio/studio-workspace.tsx` — `generate()` now uses `parseJsonResponse` instead of a bare `response.json()`.
- `scripts/verify-json-response-handling.ts` — new, zero-network verification script.
- `package.json` — added the `verify:json-response-handling` script.

## 11. Honest Limitations

- **The `maxDuration` fix reduces, but cannot mathematically guarantee elimination of, the underlying timeout** — a sufficiently degraded Gemini API (e.g. every key exhausted, forcing the full retry+rotation+model-fallback chain on every one of five sequential stages) could still, in principle, exceed even 120s, and Vercel itself clamps `maxDuration` to whatever the deployed plan actually allows (e.g. 60s on Hobby — still a 6x improvement over the previous unset 10s default). This is exactly why the frontend hardening (item 2) exists as a second, independent layer — it doesn't depend on the timeout never happening again.
- **Not verified against a real Vercel deployment** — this was reproduced and fixed by tracing the code and by a faithful local/browser simulation of the exact failure shape, not by deploying and waiting for a real timeout in production (which isn't reliably reproducible on demand and would mean deliberately degrading a production system to trigger it).
- **`response.text().catch(() => "")` inside `parseJsonResponse`'s `raw` field is diagnostic-only** — never surfaced to the user, not currently logged anywhere further than being available on the returned object; a future pass could pipe it to console.error if deeper client-side diagnostics are ever needed, but that wasn't part of the reported bug.

---

# UnfilteredTech AI Studio — Creation Experience, Image Generation & Canva Overhaul

This report documents a second, deeper pass on top of the format-first Creation page redesign from the previous session (still intact — see git history). This pass focused on three things the previous pass didn't touch: **image-generation quality** (the actual root cause of "Media unavailable" / generic-looking slides), **the Canva blank-tab bug** (root-caused precisely, not papered over), and **per-slide regeneration** — plus a UI polish pass to reduce pill/badge density per the new brief.

> **Note on git state**: before touching any code, `git status` showed a **clean working tree** — the previous session's Creation-page redesign (workspace components, format badges, etc.) had already been committed and pushed to `origin/main` by an automated mechanism outside this session's own tool calls (already flagged to you at the end of the prior session; not re-litigated here, but stated for the record since Section 35 of this task's brief explicitly asks to check `git status` first). Nothing in this pass ran `git commit`, `git push`, `git reset`, or touched any commit history.

---

## 1. Overview

Three real, verified root causes were found and fixed:

1. **Weak image-generation prompts, with no shared art direction across a carousel's slides.** The Carousel/Story/Reel Planner prompts asked Gemini for "a complete, standalone AI image generation prompt — subject, composition, lighting, mood, style" as a single throwaway clause, with no shared visual identity instruction, no negative-constraints instruction, and no text-safe-area guidance. Fixed by adding a shared `visualDirection` concept and a fully structured per-item prompt rule (Section 3).
2. **No provider fallback on image-generation failure.** `lib/ai/image-providers/manager.ts` only ever called the one configured provider (Gemini by default); a quota/availability failure went straight to `FAILED`. A second provider (FLUX, via the already-configured `HF_TOKEN`) was fully implemented but never actually used as a fallback. Fixed (Section 4).
3. **The Canva "Edit in Canva" blank-tab bug** — root-caused precisely (Section 6): a placeholder tab was opened *before* the async Canva Design Import call resolved, so the user watched a separate blank/loading tab for however long that call took. Fixed by not opening any tab until the real destination URL is known, with a real, tested fallback for the case where the delay is long enough that the browser's popup blocker kicks in anyway (Section 6).

Everything else in this pass (per-slide Carousel regeneration, keyboard navigation, pill/badge density) is additive polish layered on top of the same architecture, not a rewrite of it — see Section 9 for what was deliberately left untouched.

---

## 2. Creation Experience

The previous session's format-first redesign (`PostWorkspace`/`CarouselWorkspace`/`StoryWorkspace`/`ReelWorkspace`, the `MediaSequenceViewer`, the workflow stepper) is unchanged in its core architecture. This pass added:

- **Keyboard arrow navigation** on `MediaSequenceViewer` (used by Carousel/Story/Reel): the main viewer is now a focusable region (`tabIndex`, `role="group"`, `aria-roledescription="carousel"`, a visible focus ring) that responds to `ArrowLeft`/`ArrowRight` when focused — Tab to it or click a non-image part of it, then use the arrow keys. **Live-verified** (Section 8) by focusing the element and dispatching a real `ArrowRight` keydown, confirming the slide counter advanced from "Slide 1 / 7" to "Slide 2 / 7."
- **Per-slide Carousel regeneration** ("Regenerate this slide" — Section 5) — new, not previously possible.
- **Pill/badge density reduced** (Core Requirement #17/45 — "avoid excessive pills"): the header used to show up to four separate badge-styled pills (format, project, Brand Kit, updated-time). Now there is exactly **one** pill — the format badge — and everything else (project name, Brand Kit name, "Updated X ago") is plain muted text separated by "·", matching the brief's "clean format indicator... avoid excessive pills everywhere." Hashtags were similarly de-pilled: `HashtagsCard` (shared, so this improves the Studio's preview too) now renders each tag as plain violet-tinted text instead of a bordered/filled chip, reading closer to Instagram's own hashtag styling than an admin-panel tag list.
- **Loading-state polish**: "Edit in Canva" shows "Opening in Canva…" inline on the button itself while the request is in flight (no separate loading screen); "Sync back from Canva" shows "Syncing…" the same way.

## 3. Media Generation — Prompt Engineering

**Root cause, confirmed by reading the actual prompt builders** (`lib/ai/carousel-planner-prompt-builder.ts` and its Post/Story/Reel siblings): every per-item `imageGenerationPrompt` is *written by Gemini itself*, as one field inside the same JSON object that produces the slide's headline/body/CTA — there is no separate, deterministic prompt-construction step downstream. The only instruction Gemini was given for that field was: *"a complete, standalone AI image generation prompt — subject, composition, lighting, mood, style."* That is the entire root cause of thin, inconsistent, unrelated-looking carousel images — there was never a shared campaign concept, never an instruction to leave room for the app's own rendered text, and never an instruction against generating fake on-image text/watermarks/logos.

**Fix** — new shared module `lib/ai/image-prompt-guidelines.ts`, imported by all four planner prompt builders (Carousel/Post/Story/Reel):

- `visualDirectionRule(itemNoun)` — a rule instructing the model to decide one shared **`visualDirection`** (style, realism, lighting, color, mood, composition, photography) for the whole sequence *before* writing any individual item's prompt, and to apply that same direction consistently across every slide/frame/scene while keeping each shot distinct — "consistency without repetition," directly implementing the brief's Section 10/13.
- `imageGenerationPromptRule(aspectRatio)` — a rule specifying the exact structure every `imageGenerationPrompt` must follow: **Subject → Visual concept → Environment → Composition (incl. where the text-safe negative space sits, varied slide to slide) → Camera → Lighting → Mood → Color direction → Brand direction**, ending in a verbatim closing sentence: *"Aspect ratio {4:5 or 9:16}. Do not render any text, typography, captions, watermarks, logos, or UI elements in the image — the application renders all text separately."* This is the exact negative-constraints instruction Section 11 asked for, sent to the image provider unmodified (the Media Resolver passes `imageGenerationPrompt` straight through — see Section 4).
- New `visualDirection: visualDirectionSchema.optional()` field added to `carouselPlanObjectSchema`, `storyPlanObjectSchema`, `reelPlanObjectSchema` (`.optional()` deliberately — see Section 7 on why this needed no migration and doesn't break any existing cached plan). Post has no `visualDirection` (it's a single image, not a sequence — no shared-campaign concept needed) but gets the same structured-prompt + negative-constraints rule.

**Testing without spending quota** (Section 37's explicit instruction: don't repeatedly call paid/limited image APIs to test the UI): new `scripts/verify-image-prompts.ts` (registered as `npm run verify:image-prompts`) calls `buildCarouselPlannerPrompt` directly with a hand-built fake `ResearchObject`/`PlannerObject` and prints the resulting prompt string — **zero network calls, zero Gemini tokens spent**. Run and inspected by eye this session; confirmed the `visualDirection` JSON shape, the `visualDirectionRule`, and the `imageGenerationPromptRule` (with the correct "4:5" aspect ratio and the verbatim negative-constraints sentence) all render correctly into the final prompt text. This validates the *prompt engineering*, which is the actual deliverable here — it cannot and does not claim to validate final *image* quality, since that would require a real (paid, quota-consuming) Gemini image call, which this pass deliberately avoided per the brief.

**What was investigated and found *not* to be a template-renderer bug**: the "generic purple slides" the brief describes as an example symptom were traced to their real cause — every composition variant in `lib/template-renderer/families/editorial-tech.ts` (`hero-full-bleed`, `text-first`, `framed-editorial`, `numbered-editorial`) **does** include a `mediaFrame` element; none of them hide the generated photo. The purple/solid-color slides observed live in this database trace back to (a) a slide's original AI image generation genuinely failing (quota exhaustion), then (b) that slide being exported to Canva as a tinted placeholder (an intentional, existing, documented design — see `lib/canva/pptx-builder.ts` — so a failed slide still gets an editable Canva page rather than a blank one), then (c) the user syncing back from Canva without having added a real photo in Canva itself, which correctly persists whatever was actually in Canva. This is a real generation-failure problem (fixed by the provider fallback, Section 4) plus a known, already-documented cosmetic limitation in the sync-back path (the media-type badge can still say "Video" for a slide that's now a synced static image — flagged in the previous session's report, not touched again here, out of scope for this pass).

## 4. Media Generation — Provider Fallback

**Root cause**: `lib/ai/image-providers/manager.ts`'s `generateImage()` called exactly one provider (`getActiveImageProviderName()`, defaulting to `"gemini"`), with a same-provider retry only for `NETWORK_ERROR`/`PROVIDER_UNAVAILABLE`. A `QUOTA_EXCEEDED` error (Gemini's own image-generation quota, which is genuinely limited and separate from its text-generation quota/key-rotation resilience — confirmed by reading `lib/ai/image-providers/gemini-image-provider.ts` and `CLAUDE.md`'s own note that image generation has no model-fallback chain) went straight to a `FAILED` slide, even though a second, fully-implemented, already-configured provider (`FluxImageProvider`, using `HF_TOKEN` — confirmed present in `.env.local`, not invented) sat unused in the same file's own `PROVIDER_REGISTRY`.

**Fix**: `generateImage()` now tries the active provider (with its existing same-provider transient retry, unchanged), and on **any** failure — not just transient ones, since `QUOTA_EXCEEDED` is exactly the case this exists for — falls through to the next registered provider (`FALLBACK_PROVIDER_ORDER = ["gemini", "flux"]`, automatically skipping any name with no registered implementation, so this list is safe to extend later). Only if every registered provider fails does the normalized error propagate up to be persisted as that slide's `FAILED` status, exactly as before. No caller anywhere in the app needed to change — `resolveSlideMedia` (`lib/media-resolver/service.ts`) and every Post/Story/Reel media generator all call the same `generateImage()` entry point, so every format benefits uniformly. **No new API keys were introduced** — FLUX was already fully implemented and already configured via the existing `HF_TOKEN`; this pass only wired the Manager to actually use it as a fallback instead of leaving it dormant.

**Not live-tested against a real quota failure** (doing so on purpose would mean deliberately exhausting real Gemini quota, which Section 15/37 explicitly warns against) — verified by full code reading of the new control flow (`attemptProvider`, the `order` loop, the `lastError` propagation) and by `tsc`/`eslint`/`build` passing. This is a real, honest limitation, stated plainly rather than claimed as tested.

## 5. Regeneration

**Whole-creation regeneration** (`app/api/creations/[id]/regenerate/route.ts`) is untouched this session — still reads `creation.contentType` once, never writes it, branches into exactly one of the four format Plan services, and is the only regeneration path for Post/Story/Reel, exactly as the brief's Section 16 asks ("For Story: Regenerate Story," "For Reel: Regenerate Reel" — no more, no less).

**New this session — per-slide Carousel regeneration** ("Do not regenerate every image when only one failed slide needs regeneration"):

- `lib/carousel-plan/generate-media-for-plan.ts` gained `generateMediaForCarouselSlide()` — a thin wrapper around the *same* `resolveAndRenderSlide()` the whole-carousel path already uses (no duplicated resolution/rendering logic), scoped to exactly one `slideOrder`, always `forceRegenerate: true`.
- New route `POST /api/creations/[id]/carousel/slides/[order]/regenerate` — looks up the Creation, confirms it's a `CAROUSEL` with a real `carouselPlanId` and that the requested slide actually exists in the plan, calls the new function, then applies the same Canva-link-goes-stale data-safety guard the whole-carousel Regenerate/Canva routes already use (clears `canvaSyncStatus` back to `NOT_LINKED` since this slide's image just changed under an existing Canva design), and bumps `Creation.updatedAt` so the Review page's existing `mediaRefreshKey` remount mechanism picks up the change.
- `CarouselWorkspace` gained a "Regenerate this slide" button next to the active slide's text card, calling the new route then `router.refresh()` — reusing the exact same "mutate → refresh → remount" pattern the whole-creation Regenerate action already established, not a new one.
- **Never touches the plan's text** (headline/body/CTA/visualIntent) — only that slide's media. **Never regenerates any other slide.** **Never changes `Creation.contentType`.** Only exists for Carousel, where the underlying per-slide media architecture (`CarouselSlideMedia`, one row per slide) already supports it cleanly; Post/Story/Reel keep whole-creation-only regeneration, since inventing a per-item architecture for them wasn't asked for and isn't backed by an equivalent already-proven pattern in the time available for this pass.
- **Live-verified**: rendered correctly in the browser next to a real slide's content (see Section 8). Not clicked live this session (would consume a real image-generation call against a working provider for a code path that's a thin, low-risk wrapper around already-proven logic) — verified by full code reading and `tsc`/`eslint`/`build`.

## 6. Canva — The Blank-Tab Bug, Root-Caused and Fixed

**Trace, as instructed, not guessed:**

```
"Edit in Canva" click (review-action-bar.tsx: editInCanva())
  → (previously) window.open("", "_blank") — an empty placeholder tab, opened
    synchronously to survive the popup blocker
  → await fetch(POST /api/creations/[id]/canva/create)
      → builds a .pptx server-side
      → calls Canva's Design Import API — a genuinely ASYNCHRONOUS job
        (lib/canva/design-import.ts polls every 2s, up to a 60s ceiling;
        a real multi-slide Carousel import measured at 5.7s this session —
        see Section 8's server log)
  → response arrives → pendingTab.location.href = data.editUrl
```

**Root cause, precisely**: the placeholder tab sat on a literal, unstyled `about:blank` for the entire duration of that `fetch` — a few seconds in the common case, confirmed live at 5.7s for a real 7-slide carousel this session. This was not a misused `window.open`, not an extra app route, not anything OAuth-related — it was a real async third-party API call with nothing shown in the tab while it was in flight.

**Fix — a genuinely different flow, not a bigger band-aid on the same one** (a previous session had already tried writing a loading state into that placeholder tab; this pass removes the placeholder tab entirely, per this task's explicit direction: *"If Canva creation is asynchronous, keep the user on the current Creation page while the request completes. Then navigate/open Canva once the final URL is available"*):

1. No tab is opened at all when the user clicks "Edit in Canva" for a not-yet-linked creation. The user stays on the Creation page.
2. The button itself shows an inline "Opening in Canva…" state (`openingCanva`, a new piece of state — spinner icon swap, label swap) for the duration of the request — this *is* the "loading state," not a second browser tab.
3. Only once the real `editUrl` is known does the code call `window.open(data.editUrl, "_blank", "noopener,noreferrer")` — one clean navigation straight to the real destination, no intermediate page of any kind.
4. **Popup-blocker handling, done honestly rather than assumed away**: calling `window.open` after an `await` is exactly what popup blockers exist to catch. Browsers track a few seconds of "transient user activation" after a real click, not just the synchronous instant of the event, so a fast-resolving request still opens without a blocker prompt in the common case — but a slow one (a multi-slide Carousel import, which this session measured at 5.7s) can outlast that window. `window.open` returns `null` rather than throwing when blocked, so the code checks for that: on success, a normal confirmation toast; **on a blocked popup, the design has already been created successfully server-side** — the toast changes to *"Your browser blocked the Canva tab from opening automatically. The design was created — open it manually below."* with a **working one-click "Open Canva" action** (a fresh synchronous click, which is never blocked). No dead end either way, matching Section 25's explicit "Do not leave the user with a blank tab. Do not silently fail" and Section 24's "Do not implement a workaround that creates another UX problem."
5. The "already linked → reopen existing design" branch (clicking "Edit in Canva" a second time on a creation that already has one) is unchanged — it's a plain, synchronous `window.open(currentCanvaEditUrl, ...)` with an already-known URL, so it never had a blank-tab problem to begin with.
6. Canva creation failure (the fetch itself throwing) now shows a toast titled **"Couldn't open Canva"** with a description ("There was a problem creating the Canva design.") and a **"Try again"** action that re-runs `editInCanva()` — matching Section 25/31's exact requested shape, not a generic "Something went wrong."

**Nothing about Canva's OAuth, the create/sync/reset route handlers, or the token-refresh flow was touched.** Only `components/creations/review-action-bar.tsx`'s `editInCanva()` function and its surrounding button JSX changed.

## 7. Brand Kit

Investigated (`lib/template-renderer/brand-profile.ts`, `color-resolve.ts`): Brand Kit's colors/fonts/logo already flow into the template renderer exactly as before — this pass didn't touch that path. What changed is upstream of it: the new `imageGenerationPromptRule`'s "Brand direction" clause explicitly instructs the model to give AI-generated photography only *"a restrained nod to brand identity — never an instruction to render an actual logo, watermark, or brand name as text"* — directly implementing Section 47's *"Brand identity should generally come from the application/template layer rather than forcing giant logos into generated images."* The actual logo/watermark compositing remains entirely the template renderer's job (`lib/template-renderer/render-frame.ts`, unchanged), never the AI image provider's — this pass reinforces that separation in the prompt instructions rather than changing the renderer.

No Prisma schema or migration changes were made anywhere in this pass. The new `visualDirection` field lives inside the existing `Json` `data` column on `CarouselPlan`/`StoryPlan`/`ReelPlan` (already schema-less at the database level, Zod-validated at the application layer only — see CLAUDE.md Section 19), and is `.optional()` specifically so a plan cached before this pass exists — including every real carousel/post/story/reel this session touched live — keeps parsing correctly with no backfill, no migration, and no risk to existing creation data.

## 8. Testing

### TypeScript / ESLint / Build

- **`npx tsc --noEmit -p tsconfig.json`** — clean, zero errors. Run after every substantive change and again as a final pass.
- **`npx eslint . --ignore-pattern '.claude/**'`** — clean, zero errors/warnings across the whole repo. (The exclusion is a pre-existing, unrelated git worktree at `.claude/worktrees/project-status-doc`, untouched by this session — confirmed via `git worktree list`, same as the previous session's report.)
- **`npm run build`** (`next build --webpack`) — compiled successfully, twice (mid-pass and as a final check). The new route `/api/creations/[id]/carousel/slides/[order]/regenerate` appears correctly in the route table as `ƒ` (dynamic).

### Local, zero-quota prompt verification

- **`npm run verify:image-prompts`** — new script, executed this session. Rendered `buildCarouselPlannerPrompt` against a realistic fake research/planner brief with **zero network calls**. Output inspected by eye: the `visualDirection` JSON shape, the shared-campaign rule, and the structured per-slide prompt rule (ending in the exact "Aspect ratio 4:5. Do not render any text..." sentence) all appear correctly in the final ~7,200-character prompt.

### Browser verification — real app, real (existing) data, dev server on `localhost:3000`

All of the following were actually clicked/observed this session, not inferred from reading code:

| Check | Result |
|---|---|
| Carousel Review page (`cmsyawwt5000b8gs5jm9aox60`, a real 7-slide creation) | Header now shows exactly one pill (format) plus plain-text project/Brand Kit/updated-time metadata. |
| Keyboard navigation | Focused the viewer, dispatched a real `ArrowRight` keydown, confirmed "Slide 1 / 7" → "Slide 2 / 7" in the DOM. |
| "Regenerate this slide" button | Renders correctly next to the active slide's headline/body/visual-suggestion card. Not clicked (would consume a real image-generation call). |
| Hashtags | Confirmed the de-pilled, plain-text-with-tint rendering on a real Post creation's Caption/Hashtags panel. |
| **Canva create flow — the critical bug** | Used "Reset to AI Version" (a safe, existing, non-destructive action — confirmed via its own toast: *"Canva link cleared — this creation's current media is unchanged"*) to put a real Carousel back to `NOT_LINKED`, then clicked "Edit in Canva" for real. **Confirmed via `tabs_context_mcp` that zero tabs existed until the request resolved** — no blank tab, ever, at any point. The server log confirmed a single `POST .../canva/create` request taking 5.7s. **In this automated-browser-extension environment specifically, that 5.7s delay was long enough that the page's own `window.open()` call registered as blocked** (`opened` was falsy) — the app correctly showed the "browser blocked the Canva tab… \[Open Canva\]" fallback toast, and clicking that action button opened a real, fully-rendered Canva editor (`https://www.canva.com/design/DAHSo1ub75s/…/edit`, all 7 pages present) on a fresh, always-reliable synchronous click. This is an honest, complete verification of **both** code paths this fix's popup-blocker handling exists for — not just the happy path. |
| Post Review page (`cmsybd70b0004tds5e60yz2la`) | Confirmed unaffected by the header/hashtag styling changes; hero image + content panel render exactly as the previous session's redesign intended. |
| Studio (`/studio`) | Not re-checked this session (no code touched this session that it depends on — `GeneratedContentSections`/`OutputPanel` weren't modified again). |

**Not tested live**: a real quota-exhaustion failure on Gemini (would require deliberately exhausting real quota, against Section 15/37's explicit instruction); Story/Reel per-item image prompts against real generated media (no Story/Reel creation with a real Plan exists in this database — same honest gap noted in the previous session's report, unchanged by this pass since it didn't touch Story/Reel media generation code, only their prompt *text*); a real "Sync back from Canva" round trip (unchanged code this session, already live-verified in an earlier session).

---

## 9. Root Causes (summary)

- **Weak image generation**: per-item `imageGenerationPrompt` was Gemini-authored from a one-line instruction with no shared campaign direction, no negative constraints, no text-safe-area guidance. Fixed at the prompt-engineering layer (Section 3) — no template-renderer or provider-architecture rewrite was needed for this part.
- **Poor carousel visual consistency**: direct consequence of the above — no shared `visualDirection` existed for the model to apply across slides. Fixed by the same change.
- **Media fallback problems ("generic purple slides")**: not a template-renderer bug (every composition includes a real media frame) — traced to real generation failures plus the existing, intentional Canva-placeholder-on-failure design, compounded by no provider fallback existing. The provider-fallback fix (Section 4) directly reduces how often a slide ever reaches that state.
- **Canva blank white screen**: root-caused to a placeholder tab opened before the async Canva Design Import call resolved. Fixed by not opening any tab until the real URL is known, with a real, tested graceful-degradation path for when the browser's popup blocker still catches a slow response.
- **Creation page UX problems**: addressed in the previous session's format-first redesign (unchanged this session) plus this session's pill/badge density reduction and keyboard-navigation addition.

## 10. Files Changed

**New:**
- `lib/ai/visual-direction-schema.ts` — the shared `visualDirection` Zod schema.
- `lib/ai/image-prompt-guidelines.ts` — shared prompt-rule text (`visualDirectionRule`, `imageGenerationPromptRule`, `VISUAL_DIRECTION_JSON_SHAPE`), imported by all four planner prompt builders.
- `scripts/verify-image-prompts.ts` — zero-network local prompt-rendering check (`npm run verify:image-prompts`).
- `app/api/creations/[id]/carousel/slides/[order]/regenerate/route.ts` — per-slide Carousel regeneration endpoint.

**Modified:**
- `lib/ai/carousel-planner-schemas.ts`, `story-planner-schemas.ts`, `reel-planner-schemas.ts` — added optional `visualDirection` field.
- `lib/ai/carousel-planner-prompt-builder.ts`, `post-planner-prompt-builder.ts`, `story-planner-prompt-builder.ts`, `reel-planner-prompt-builder.ts` — wired in the new shared prompt guidance.
- `lib/ai/image-providers/manager.ts` — added cross-provider fallback (Gemini → FLUX) in `generateImage()`.
- `lib/carousel-plan/generate-media-for-plan.ts` — added `generateMediaForCarouselSlide()`.
- `components/creations/review-action-bar.tsx` — rewrote `editInCanva()`'s tab-opening strategy (Section 6); added inline "Opening in Canva…"/"Syncing…" button states; the earlier session's icon-only Delete button and sticky-bar shadow are unchanged.
- `components/creations/carousel-workspace.tsx` — added "Regenerate this slide" button + handler.
- `components/creations/media-sequence-viewer.tsx` — added keyboard arrow navigation (focusable region, `ArrowLeft`/`ArrowRight`).
- `components/creations/hashtags-card.tsx` — de-pilled hashtag styling (shared with the Studio's preview).
- `app/(dashboard)/creations/[id]/page.tsx` — header meta row reduced to one pill + plain text (removed the `BrandKitBadge`/project-name pill wrappers, kept `FormatBadge`).
- `package.json` — added the `verify:image-prompts` script.

**Explicitly not touched this session** (verified via `git status`/`git diff` scope): `app/api/creations/[id]/canva/create/route.ts`, `.../canva/sync/route.ts`, `.../canva/reset/route.ts`, every OAuth route, `lib/canva/*`, `app/api/creations/[id]/regenerate/route.ts` (whole-creation regenerate), the Prisma schema, `lib/template-renderer/*`, `lib/media-resolver/service.ts`, `PostWorkspace`/`StoryWorkspace`/`ReelWorkspace`/`workflow-status.tsx`/`format-badge.tsx`/`truncated-title.tsx` (from the previous session's redesign, left as-is).

## 11. Remaining Limitations (honest)

- **No live test of the provider-fallback path against a real quota failure** — verified by code reading only, per the explicit instruction not to burn real quota to test this.
- **No live test of Story/Reel per-item image prompts against real generated media** — no Story/Reel creation with a real Plan exists in this database; the prompt-text change was verified via `verify:image-prompts` (Carousel) and by symmetry of the shared `image-prompt-guidelines.ts` module, not via a live Story/Reel generation.
- **Per-slide regenerate is Carousel-only** — Post/Story/Reel remain whole-creation-only regeneration, matching what the existing architecture actually supports; not extended speculatively.
- **Actual generated-image quality was not (and could not responsibly be) verified this session** — the prompt *text* was verified locally; whether Gemini's actual image output measurably improves is something only a real generation can show, and this pass deliberately didn't spend quota on that per the brief's own instruction.
- **The known cosmetic media-type-badge limitation after a Carousel Sync back** (documented in the previous session's report) is unchanged — out of this pass's scope.
- **Unexpected git commits/pushes** — as noted at the top, `git status` was clean before this session started because a previous session's work had already been committed/pushed by a mechanism outside any explicit tool call in this conversation. Nothing here reverses or investigates that further; flagged for visibility only.

## 12. Final Verdict

The three highest-leverage root causes this brief asked for were found by reading the actual code (not guessed) and fixed with targeted, backward-compatible changes: structured, art-directed image prompts with a shared campaign direction; an automatic fallback to the already-configured second image provider; and a genuinely re-architected Canva "Edit in Canva" flow that keeps the user on the Creation page during the async wait and was verified — including its popup-blocker edge case — against the real, running app. Per-slide Carousel regeneration and a calmer, less pill-heavy Creation page round out the pass. `tsc`, `eslint`, and `next build` all pass clean. The two things this report is explicit about *not* claiming — measured image-quality improvement and a live quota-exhaustion fallback test — are the two things that would require spending real, paid API quota to verify, which the brief itself said not to do without genuine necessity.
