# PROJECT_STATUS.md

> Living status doc. **Update this file after every completed feature.** It reflects the actual state of the codebase, not the aspirational feature list in `README.md` — see `CLAUDE.md` for the full technical handbook this is derived from.
>
> Last updated: 2026-07-31 (initial creation, based on repo state at commit `75b5a59`).

---

# Project Information

- **Project name**: UnfilterdTech AI Studio
- **Current version**: `0.1.0` (`package.json`) — pre-release / MVP stage
- **Current milestone**: MVP Core Creative Loop (Brand Kit → Project → AI Studio generation → Creation → AI rewrite → Accept rewrite), single-user, no auth
- **Overall progress**: **~40%** toward a production-ready, multi-user product. This is a rough estimate, not a tracked burndown: the full end-to-end single-user creative loop works, but authentication, brand-aware generation, real dashboard/history data, and everything in the README's "Planned" roadmap are not started. Treat this number as directional and recompute it manually as features land.

---

# Current Sprint

There is no sprint/issue tracker wired into this repo (no `.github/`, no linked project board). This section is inferred from git history and code state — replace with real sprint data once a tracker exists.

- **Sprint goal (inferred from latest commits)**: Stabilize the AI Studio → Creation → AI Assistant rewrite loop and get the app building cleanly for production (`75b5a59 feat: complete AI Studio creation management and production build fixes`).
- **Active work**: None in progress in the working tree as of this writing — `git status` is clean relative to the last commit.
- **Next priority**: Close the gap between the product's core promise ("brand-safe" content) and reality — Brand Kit data currently has no effect on generation. See [Next Recommended Tasks](#next-recommended-tasks).

---

# Completed Features

Verified against code, not the README:

- **Brand Kit** — full create/read/update/delete via Server Actions (`lib/brand-kit/actions.ts`), list UI with empty state, color/keyword/hashtag/avoid-word fields.
- **Projects** — full CRUD via REST routes (`app/api/projects*`), list + detail pages, optional Brand Kit association, per-type creation counts, color tagging.
- **AI Studio** — source selection (topic/text/url), content-type selection (post/carousel/story/reel), tone + creativity controls, single-format Gemini generation, tabbed output preview, copy-to-clipboard, save-to-project (with inline "create project" fallback).
- **Creation Details** — creation persisted with full multi-format payload (caption/hashtags/carousel/story/reel); detail page renders caption + original prompt.
- **AI Rewrite Assistant** — quick-action buttons (Shorter/Funny/Better Hook/Professional/Instagram/LinkedIn) and free-form instruction, single-turn Gemini rewrite via `/api/rewrite`.
- **Accept Rewrite** — persists the rewritten text back onto the Creation's `caption` via `PATCH /api/creations/[id]/caption`, then hard-reloads the page.
- **Shell/UX** — collapsible sidebar, mobile nav sheet, light/dark/system theme toggle, toast notifications (Sonner).

**Not completed, despite being commonly assumed "done":**
- **Authentication** — **not implemented at all.** No `User` model, no middleware, no session handling, no login UI. The header avatar/name ("HB" / "Harsh Bhanushali") is hardcoded, not derived from a real session. Treat any auth work as new-feature work, not a bug fix.

---

# Features In Progress

Nothing is under active construction in the working tree right now, but the following are **scaffolded without being functional** — worth tracking as "started, not finished" rather than "not started":

- **Manual Caption Editor** — the Creation detail page has an `Edit` button in its header with no `onClick` handler.
- **Copy Caption (header button)** — same page, a second `Copy` button in the header with no handler (a *working* copy button already exists inside the AI Studio's `OutputPanel`, but not here).
- **Brand-aware generation** — a Project can reference a Brand Kit, but `buildInstagramContentPrompt` never reads any Brand Kit field. The data model supports it; the prompt logic doesn't use it yet.

---

# Planned Roadmap

Prioritized by (a) how foundational the gap is and (b) what's explicitly listed in the README's roadmap. Not a commitment — a suggested order.

1. **Authentication & per-user data scoping** — blocks any real multi-user usage; touches every model and every query.
2. **Brand Kit → Generation integration** — wire Brand Kit tone/keywords/avoid-words into `buildInstagramContentPrompt`; this is the product's core differentiator and is currently inert.
3. **Real dashboard data** — replace the hardcoded stats/recent-creations arrays on `/` with actual Prisma aggregates.
4. **`/history` implementation** — currently a static empty state; needs a real query (likely: all Creations, filterable/searchable).
5. **Manual Caption Editor** — wire up the existing (non-functional) Edit button on the Creation page.
6. **Version History** for creations (README roadmap item).
7. **AI Image Generation** (README roadmap item).
8. **Social Media Publishing** (README roadmap item).
9. **Content Calendar** (README roadmap item).
10. **Analytics Dashboard** (README roadmap item).
11. **Team Collaboration / Approval Workflow / Multi-Brand Support** (README roadmap items — depend on #1, Authentication, being done first).

---

# Database Status

- **Engine**: PostgreSQL (Supabase-hosted), via Prisma ORM `7.9.0` with the `@prisma/adapter-pg` driver adapter.
- **Models (3)**: `BrandKit`, `Project`, `Creation`. **Enum (1)**: `ContentType` (`POST | CAROUSEL | STORY | REEL`).
- **Relations**: `Project.brandKitId → BrandKit` (nullable, `onDelete: SetNull`), `Creation.projectId → Project` (nullable, `onDelete: SetNull`). No cascading deletes anywhere.
- **Migrations (2)**: `20260724142020_init` (Project + Creation), `20260726085635_add_brand_kit` (BrandKit + `Project.brandKitId`). Treat migration history as append-only.
- **No `User` model** — no per-record ownership column exists on any model.
- **Indexes**: `Project.brandKitId`, `Creation.projectId`, `Creation.createdAt`. No pagination (`take`/`cursor`) used anywhere yet — fine at current volume.

---

# API Status

All endpoints are Next.js Route Handlers under `app/api/**`. No authentication, no rate limiting, on any route.

| Endpoint | Methods | Status |
|---|---|---|
| `/api/generate` | POST | ✅ Working. Zod-validated in/out, `AIServiceError` handling. |
| `/api/rewrite` | POST | ✅ Working. Manual validation only, no output schema. |
| `/api/projects` | GET, POST | ✅ Working. No Zod validation. |
| `/api/projects/[id]` | GET, PATCH, DELETE | ✅ Working. No Zod validation. |
| `/api/creations` | POST | ✅ Working (save only). No Zod validation. |
| `/api/creations/[id]/caption` | PATCH | ✅ Working, but **no `try/catch`** — a bad id throws an unhandled 500. |
| `/api/brand-kit` | GET only | ✅ Working — returns `{id,name}` only, for dropdowns. Full Brand Kit CRUD is **not** REST — it's Server Actions in `lib/brand-kit/actions.ts`. |
| `/api/creations` (list) / `/api/creations/[id]` (detail) | — | **Does not exist.** Reads happen via direct Prisma calls in Server Components instead. |

Two coexisting mutation patterns in the app — don't mix them for the same resource: REST routes (Projects, Creations) vs. Server Actions (Brand Kit).

---

# AI Features Status

- **Generation** (`lib/ai/gemini.ts`, `generateInstagramContent`) — ✅ active, uses `@google/generative-ai`, forces JSON response mode, validates output against a Zod schema before returning. Always generates all four formats (caption/hashtags/carousel/story/reel) even though only one is requested/shown at a time.
- **Rewrite** (`rewriteContent`) — ✅ active, plain-text prompt/response, **no output validation**.
- **OpenRouter provider** (`lib/ai/openrouter.ts`) — built and functionally complete, but **not wired in** (not exported from `lib/ai/index.ts`, nothing imports it). Dead code today, not a bug — don't activate it without being asked.
- **No streaming** — both AI routes await the full response.
- **No multi-turn memory** — the "AI Assistant" is single-turn; each request re-sends the original caption, not the conversation.
- **No markdown rendering** — despite README claims of `react-markdown`/`remark-gfm`, neither package is installed; rewrite output is plain text.
- **No Brand Kit context** in any prompt — see Roadmap #2.
- **No prompt-injection mitigation** — user input is interpolated directly into the Gemini prompt string.

---

# Technical Debt

(Full detail in `CLAUDE.md` §28 — condensed here.)

- Dashboard home page (`/`) stats + recent creations are hardcoded mock arrays, not DB-driven.
- `/history` and `/settings` are static, non-functional pages.
- Brand Kit data doesn't reach the Gemini prompt.
- Three inconsistent "default project color" values across schema/API/client.
- Dead code: `lib/ai/openrouter.ts`, six unused `components/creations/*-card.tsx` files, a commented-out duplicate `save()` in `create-brand-dialog.tsx`, a stale `test-gemini.js` entry in `tsconfig.json`'s `include`.
- `structure.txt` (~3MB) is committed to git at the repo root — likely accidental.
- README drift: wrong Next.js version claim, unused markdown-rendering claim, Authentication claimed as done when it isn't.
- No tests, no CI — `npm run lint` / `npm run build` are the only gates.
- Installed-but-unused deps: `zustand`, `@tanstack/react-query`, `react-hook-form` + resolvers, `framer-motion`.

---

# Known Bugs

- **Creation detail page assumes `creation.project` is non-null** (`creation.project.id`/`.name` accessed unconditionally) — would throw if a project-less creation is ever rendered. Not currently reachable via the UI, but a landmine if the "always require a project" constraint is ever relaxed.
- **Edit / Copy Caption buttons** on the Creation detail page header do nothing (no handlers).
- **Settings page toggles** (`Switch defaultChecked`) don't persist any state.
- **`PATCH /api/creations/[id]/caption`** has no `try/catch` — an invalid id surfaces as an unhandled 500 instead of a clean error response.
- **AI Assistant rewrite/accept failures** are only `console.error`'d — no toast or inline error shown to the user, unlike every other mutation flow in the app.
- **`quickRewrite()` doesn't clear the instruction textarea** after sending (minor, `rewrite()` does clear it — inconsistent, not harmful).

---

# Recent Decisions

Inferred from the codebase and config (no separate decision log exists — add real ADRs here going forward if the team wants one):

- Gemini (`@google/generative-ai`) is the active AI provider; an OpenRouter implementation was built in parallel but deliberately left unwired.
- Brand Kit uses Next.js Server Actions for CRUD; Projects and Creations use REST route handlers. This split is intentional — don't unify without discussion.
- Prisma 7 with the `@prisma/adapter-pg` driver adapter and `prisma.config.ts` (not legacy `package.json#prisma` config).
- Production build is pinned to Webpack (`next build --webpack`), not Turbopack.
- Parent-to-child relations (`Project → BrandKit`, `Creation → Project`) use `onDelete: SetNull` (soft-detach) rather than cascade or restrict — deleting a Brand Kit or Project never deletes downstream records.

---

# Next Recommended Tasks

1. Decide and implement an authentication approach (this blocks real multi-user usage and touches every model).
2. Wire Brand Kit fields (`tone`, `keywords`, `avoidWords`, `writingStyle`, etc.) into `buildInstagramContentPrompt`.
3. Replace the dashboard's mock stats/recent-creations with real Prisma queries.
4. Implement `/history` as a real, queryable Creations view.
5. Wire up or remove the non-functional Edit / Copy Caption buttons on the Creation detail page.
6. Clean up flagged dead code (`lib/ai/openrouter.ts`, unused `components/creations/*-card.tsx` files, commented code in `create-brand-dialog.tsx`, stale `test-gemini.js` tsconfig entry) — confirm with the repo owner before deleting `structure.txt`.
7. Add Zod validation to the Projects/Creations routes to match the `/api/generate` standard.

---

# Definition of Current Milestone

**Milestone: MVP Core Creative Loop — ACHIEVED**

Done criteria (all met):
- A user can define a Brand Kit, create a Project, generate content in the AI Studio via Gemini, save it as a Creation, and improve its caption through the AI Assistant rewrite/accept flow — end to end, for a single user.
- The app builds cleanly (`npm run build`) and lints cleanly (`npm run lint`).

**Next milestone (not yet started, no name assigned)**: closing the "single-tenant, brand-blind" gap — authentication + per-user data scoping, and Brand Kit data actually influencing generation. Update this section once that milestone is formally kicked off.
