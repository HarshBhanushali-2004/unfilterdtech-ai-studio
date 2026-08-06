@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> This is the permanent engineering handbook for **UnfilterdTech AI Studio**. It documents the codebase as it actually exists today — not the aspirational feature set described in `README.md`. Where the two disagree, this file calls it out explicitly. Keep this document in sync with the code as the project evolves.

---

## 1. Project Overview

UnfilterdTech AI Studio is a single-tenant SaaS-style web application for generating and refining social media content (Instagram posts, carousels, stories, and reels) using Google Gemini. A user defines a **Brand Kit** (voice, tone, colors, keywords), organizes work into **Projects**, generates content in the **AI Studio**, saves the result as a **Creation**, and iteratively improves the saved caption through an **AI Assistant** rewrite flow.

The app is currently built and used as a single-user workspace (there is no multi-tenant account system — see [Section 8, Authentication Flow](#8-authentication-flow)).

## 2. Business Goal

Give solo creators and small marketing teams a fast path from a raw idea (a topic, a block of text, or a reference URL) to a polished, on-brand, multi-format social media draft, without needing a copywriter for the first pass. The product bets on two things:

- **Brand consistency**: Brand Kit data is meant to be fed into generation prompts so every output matches a defined voice (see [Section 22, Known Technical Debt](#28-known-technical-debt) — this wiring is not yet complete).
- **Iteration speed**: the AI Assistant rewrite loop (quick actions + free-form instructions) lets a user reshape a caption without regenerating from scratch or leaving the creation page.

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js `16.2.11` (App Router) | README says "Next.js 15" — that's stale; the installed/running version is 16. **Next.js 16 has breaking changes vs. the version in your training data** — see `AGENTS.md` and read `node_modules/next/dist/docs/` before writing framework code. |
| UI library | React `19.2.4`, React DOM `19.2.4` | |
| Language | TypeScript `5.x`, `strict: true` | |
| Styling | Tailwind CSS `v4` (`@theme inline` tokens in `app/globals.css`), `tw-animate-css` | No `tailwind.config.*` — v4 is CSS-first, configured via `@import`/`@theme` in `app/globals.css`. |
| Component system | shadcn/ui, style `radix-nova` (see `components.json`) | Backed by the standalone `radix-ui` package plus individual `@radix-ui/react-*` packages. |
| Forms/validation | `react-hook-form`, `@hookform/resolvers`, `zod` (v4) | `react-hook-form` is a dependency but the current forms (Brand Kit, Project dialogs) are hand-rolled `useState` forms, not wired to it — see Known Technical Debt. |
| Data layer | Prisma ORM `7.9.0` with `@prisma/adapter-pg` driver adapter | Talks to PostgreSQL (Supabase-hosted) over `pg`. |
| State/data fetching | `zustand` (installed, unused so far), `@tanstack/react-query` + devtools (installed, unused so far) | Data fetching today is plain `fetch` in `useEffect`/handlers, or direct Prisma calls in Server Components. |
| AI | `@google/generative-ai` (Gemini SDK) | Model name from `GEMINI_MODEL` env, default `gemini-2.5-flash`. |
| Notifications | `sonner` (toast), rendered via `components/ui/sonner.tsx` in the root layout | |
| Theming | `next-themes` | class-based light/dark/system, toggle lives in the dashboard header. |
| Icons | `lucide-react` | |
| Animation | `framer-motion` (installed; not yet used in the files read for this handbook) | |

## 4. Folder Structure

```
app/
├── (dashboard)/                 # Route group — shares DashboardShell layout, no own URL segment
│   ├── layout.tsx                # Wraps children in <DashboardShell>
│   ├── page.tsx                  # "/" — dashboard home (mock/static data, see Tech Debt)
│   ├── studio/page.tsx           # "/studio" — AI Studio workspace
│   ├── projects/page.tsx         # "/projects" — project list
│   ├── projects/[id]/page.tsx    # "/projects/:id" — project detail + creation list
│   ├── creations/[id]/page.tsx   # "/creations/:id" — creation detail + AI Assistant
│   ├── brand-kit/page.tsx        # "/brand-kit" — brand kit list/CRUD
│   ├── history/page.tsx          # "/history" — static empty state only, not implemented
│   └── settings/page.tsx         # "/settings" — static, non-persisted UI only
├── api/                          # Route Handlers (REST-style JSON endpoints)
│   ├── generate/route.ts         # POST — Gemini content generation
│   ├── rewrite/route.ts          # POST — Gemini caption rewrite
│   ├── projects/route.ts         # GET, POST
│   ├── projects/[id]/route.ts    # GET, PATCH, DELETE
│   ├── creations/route.ts        # POST (save a generated creation)
│   ├── creations/[id]/caption/route.ts  # PATCH (accept a rewrite)
│   └── brand-kit/route.ts        # GET (id/name list only — full CRUD is server actions, see below)
├── layout.tsx                    # Root layout: <html>, ThemeProvider, TooltipProvider, Toaster
└── globals.css                   # Tailwind v4 theme tokens (OKLCH colors, radii)

components/
├── ai-studio/                    # Studio workspace: source/content selectors, settings, output, progress
├── brand-kit/                    # Brand Kit list/cards/forms/dialogs (server-action driven)
├── creations/                    # Creation detail page pieces (ai-editor-panel is the only one wired up)
├── dashboard/                    # Shell chrome: sidebar/header, page-header, empty-state
├── projects/                     # Project cards/dialogs/actions (REST-driven)
├── ui/                           # shadcn/ui primitives (generated, thin Radix wrappers)
└── theme-provider.tsx             # next-themes wrapper

lib/
├── ai/                            # Gemini integration, prompt building, zod schemas, shared types
│   ├── index.ts                   # Public barrel — only exports the Gemini path
│   ├── gemini.ts                  # Active provider implementation
│   ├── openrouter.ts               # Parallel alternative provider — NOT wired in, dead code today
│   ├── prompt-builder.ts
│   ├── schemas.ts
│   └── types.ts
├── brand-kit/                     # Server actions + zod schema + DTO/serialization helpers
│   ├── actions.ts                  # "use server" — createBrandKit/updateBrandKit/deleteBrandKit/getBrandKit(s)
│   ├── schema.ts
│   ├── dto.ts
│   └── helpers.ts
├── prisma.ts                       # Prisma client singleton (driver adapter, global caching in dev)
└── utils.ts                        # `cn()` class-merge helper

prisma/
├── schema.prisma                   # Project / Creation / BrandKit models + ContentType enum
└── migrations/                     # 20260724142020_init, 20260726085635_add_brand_kit

prisma.config.ts                    # Prisma 7 config file (schema path, migrations path, datasource url)
```

Component/module names are stable enough to rely on directly — don't re-derive this tree from scratch each session, just `ls`/`grep` to confirm before touching an area that may have grown.

## 5. Application Architecture

- **Next.js App Router, mixed rendering strategy.** Read-heavy pages (`/projects`, `/projects/[id]`, `/creations/[id]`, `/brand-kit`) are **Server Components** that call `prisma` (or a Brand Kit server action) directly at render time — there is no client-side data fetching for the initial page load on these routes. Interactive pieces (dialogs, the Studio workspace, the AI Assistant panel) are `"use client"` islands nested inside those server-rendered pages.
- **Two coexisting mutation patterns** — know which one applies before adding a feature:
  - **Projects and Creations** are mutated through classic REST **Route Handlers** under `app/api/**/route.ts`, called from client components via `fetch`. Client components call `router.refresh()` after a successful mutation to re-pull the Server Component data rather than managing their own cache.
  - **Brand Kit** is mutated through **Next.js Server Actions** (`"use server"` functions in `lib/brand-kit/actions.ts`) called directly from client components inside `startTransition`, with `revalidatePath("/brand-kit")` on the server side. There is a `GET /api/brand-kit` route, but it exists only to power `<select>` dropdowns elsewhere (Projects dialogs), not for CRUD.
  - Do not blend the two patterns for the same resource. If you extend Brand Kit, keep using server actions; if you extend Projects/Creations, keep using route handlers.
- **AI generation is stateless request/response.** `POST /api/generate` builds a single prompt (`buildInstagramContentPrompt`), calls Gemini once with `responseMimeType: "application/json"`, validates the parsed JSON against a Zod schema, and returns it. There is no streaming, no server-side session/history of generations.
- **The "AI Assistant" rewrite is also single-turn.** Each click of a quick action or "Send" is an independent `POST /api/rewrite` call with the *original* creation caption plus an instruction; it is not a multi-turn conversation with memory, even though the UI is styled like a chat panel (see [Section 13](#13-ai-assistant-rewrite-flow)).
- **Client state is local `useState`**, not global. `zustand` and `@tanstack/react-query` are installed but not used by any file read while building this handbook — treat them as available-but-unadopted, not as the established pattern.

## 6. Database Schema

Single PostgreSQL database (Supabase-hosted in this project), accessed through Prisma with the `@prisma/adapter-pg` driver adapter (`lib/prisma.ts`). Two migrations exist: `20260724142020_init` (Project + Creation) and `20260726085635_add_brand_kit` (BrandKit + `Project.brandKitId`).

### `enum ContentType`
```
POST | CAROUSEL | STORY | REEL
```
Used only on `Creation.contentType`. Note the UI/API layer uses a *different* string vocabulary in places (`"post" | "carousel" | "story" | "reel"` in `components/ai-studio/types.ts`, `"instagram_post" | "carousel" | "story" | "reel"` sent to `/api/generate`) — `app/api/creations/route.ts` maps the lowercase UI value to the enum via a local `contentTypeMap`. If you add a new content type, you must update it in four places: the Prisma enum + migration, `components/ai-studio/types.ts`, `lib/ai/types.ts`'s `contentTypes` tuple, and the `contentTypeMap` in the creations route.

### `model BrandKit`
The reusable brand identity. No relation to `Creation` directly — it only reaches creations transitively through `Project`.

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `name` | `String` | required |
| `website`, `industry`, `description` | `String?` | |
| `targetAudience` | `String?` | |
| `language` | `String? @default("English")` | |
| `tone`, `writingStyle`, `emojiStyle`, `ctaStyle` | `String?` | free-text voice/style descriptors |
| `logoUrl` | `String?` | |
| `primaryColor`, `secondaryColor`, `accentColor` | `String?` | hex strings, edited via `<input type="color">` |
| `keywords`, `hashtags`, `avoidWords` | `String[]` | Postgres text arrays; forms edit these as comma-separated strings and split/join at the boundary (`create-brand-dialog.tsx`) |
| `projects` | `Project[]` | inverse of `Project.brandKit` |
| `createdAt`, `updatedAt` | `DateTime` | standard timestamps |

### `model Project`
A container that groups creations and optionally inherits a Brand Kit.

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `name` | `String` | required |
| `description` | `String?` | |
| `color` | `String? @default("#3B82F6")` | swatch used across cards/badges; UI picker actually offers a different fixed palette (`#7C3AED` etc.) |
| `brandKitId` | `String?` → `brandKit BrandKit? @relation(onDelete: SetNull)` | deleting a Brand Kit does not delete or block deleting its projects — `brandKitId` is just nulled out |
| `creations` | `Creation[]` | inverse of `Creation.project` |
| `createdAt`, `updatedAt` | `DateTime` | |
| `@@index([brandKitId])` | | |

### `model Creation`
A single saved, generated piece of content — the record of one Studio → Save action.

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `projectId` | `String?` → `project Project? @relation(onDelete: SetNull)` | a creation can exist without a project (nullable), but the current UI always forces the user to pick/create one before saving (`SelectProjectDialog`) |
| `title` | `String` | populated by the client as `caption.slice(0, 60)` — there's no independent title input anywhere |
| `prompt` | `String @db.Text` | the raw source input the user typed (topic/text/url), not the fully-built Gemini prompt |
| `contentType` | `ContentType` | required |
| `tone` | `String?` | free text, from the Studio's tone select |
| `creativity` | `Int?` | 0–100 slider value |
| `caption` | `String @db.Text` | the single field the AI Assistant rewrite flow edits |
| `hashtags` | `Json?` | array of strings, stored as JSON |
| `carousel` | `Json?` | array of `{slideNumber, headline, body, visualSuggestion}` |
| `story` | `Json?` | array of `{frameNumber, text, visualSuggestion}` |
| `reel` | `Json?` | `{hook, script, scenes: [{sceneNumber, visual, narration}]}` |
| `model` | `String?` | defaults to `"Gemini"`, set by the client, not derived server-side |
| `createdAt`, `updatedAt` | `DateTime` | |
| `@@index([projectId])`, `@@index([createdAt])` | | |

Note: even though a Studio session only requests **one** content format at a time (`contentTypes: [apiContentTypeByContentType[contentType]]`), the Gemini prompt always instructs the model to populate `caption`, `hashtags`, `carousel`, `story`, and `reel` regardless of which format was requested, and all of it gets persisted on save. There's no per-request slimming — every `Creation` row carries the full multi-format payload.

## 7. API Routes

All routes are plain Next.js **Route Handlers** (`app/api/**/route.ts`), not `tRPC`/GraphQL. None of them currently perform authentication/authorization checks (see [Section 8](#8-authentication-flow)) or rate limiting.

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| `POST` | `/api/generate` | `{ sourceType, input, contentTypes, tone, creativity }` (validated by `generateContentInputSchema`) | `200 { data: GeneratedInstagramContent }` | `runtime = "nodejs"`. Errors: `400` bad JSON/invalid input, `502` Gemini call failed or returned unparsable/invalid-shape JSON, `503` missing `GEMINI_API_KEY`, `500` fallback. |
| `POST` | `/api/rewrite` | `{ content: string, instruction: string }` (manually checked, **not** Zod-validated) | `200 { data: string }` | `runtime = "nodejs"`. `400` if either field missing, `503`/`502`/`500` mirroring `AIServiceError` from `rewriteContent`. |
| `GET` | `/api/projects` | — | `200 Project[]` ordered by `createdAt desc` | No pagination. |
| `POST` | `/api/projects` | `{ name, description?, color?, brandKitId? }` | `201 Project` | `400` if `name` is empty after trim. `color` defaults to `"#7C3AED"` server-side (note this differs from the Prisma schema's own default of `#3B82F6`, and from the client's own default swatch — three different "default color" values exist across the stack). |
| `GET` | `/api/projects/[id]` | — | `200 Project` | `404` if not found. |
| `PATCH` | `/api/projects/[id]` | `{ name, description, color, brandKitId? }` | `200 Project` | No partial-update guarding — passes all fields straight through to `prisma.update`; passing `undefined` for a field will still be accepted by Prisma as "no change" but there's no schema validation on this endpoint. |
| `DELETE` | `/api/projects/[id]` | — | `200 { success: true }` | Deleting a project cascades to nothing explicitly protected — `Creation.projectId` is `onDelete: SetNull`, so its creations survive as project-less. |
| `POST` | `/api/creations` | `{ projectId?, title, prompt, contentType, tone?, creativity?, caption, hashtags?, carousel?, story?, reel?, model? }` | `200 { success: true, id }` | `contentType` (lowercase UI string) is mapped to the Prisma enum via `contentTypeMap`; an unrecognized value silently maps to `undefined` and will throw inside Prisma, caught by the generic `500` handler. No Zod validation on this route. |
| `PATCH` | `/api/creations/[id]/caption` | `{ caption: string }` | `200 { success: true, caption }` | No existence check before update (a bad `id` throws a Prisma "record not found" error, surfaced as an unhandled 500 — there's no `try/catch` in this handler at all, unlike the others). |
| `GET` | `/api/brand-kit` | — | `200 { id, name }[]` ordered by `name asc` | Only exposes `id`/`name` — used purely to populate Brand Kit `<Select>` pickers in Project dialogs. Full Brand Kit reads/writes go through `lib/brand-kit/actions.ts`, not this route. |

There is no `GET /api/creations` (list) or `GET /api/creations/[id]` (detail) route — the Creation detail and Project-detail creation lists are read directly via Prisma inside their Server Components, not via the API layer.

## 8. Authentication Flow

**There is no authentication implemented in this codebase.** There is no `middleware.ts`, no NextAuth/Auth.js, no Supabase Auth wiring, no session cookie handling, and no `User` model in `prisma/schema.prisma`. Every route and page is public and unscoped.

- The README's "🔐 Authentication" feature section and the `.env` template's `NEXTAUTH_SECRET`/`NEXTAUTH_URL` placeholders describe an intended/future state, not the current one — don't assume they're implemented when reasoning about the code.
- The UI hardcodes a single identity: the dashboard header avatar shows fixed initials `"HB"` and the dropdown label is the literal string `"Harsh Bhanushali" / "Creator workspace"` (`components/dashboard/dashboard-shell.tsx`). This is decorative only.
- All data in `Project`, `Creation`, and `BrandKit` is effectively global/shared — there is no `userId`/`ownerId` column anywhere, so if multi-user support is ever added, every model needs a scoping column plus a migration, and every Prisma query in every route/page/action needs a `where: { userId }` (or equivalent) added.
- If you're asked to "add login" or "protect a route," treat it as new-feature work, not a bug fix — there is no partially-built auth system to repair.

## 9. Brand Kit Module

Purpose: define a reusable identity (name, voice, colors, keyword guidance) that a Project can optionally attach to.

- **Route**: `/brand-kit` → `app/(dashboard)/brand-kit/page.tsx` (Server Component) calls `getBrandKits()` (a server action) and passes the data into `BrandKitPageClient`.
- **List/empty state**: `components/brand-kit/brand-kit-page.tsx` renders `EmptyState` when there are zero kits, otherwise a responsive grid of `BrandKitCard`.
- **Create**: `+ Add Brand` opens `CreateBrandDialog`, which holds form state as plain strings (comma-separated for `keywords`/`hashtags`/`avoidWords`), then on submit calls the `createBrandKit` server action inside `startTransition`, splitting/trimming/filtering the comma-separated fields into arrays before sending.
  - **Known dead code**: `create-brand-dialog.tsx` contains a large commented-out duplicate of the same `save()` function (lines directly above the live one). Clean this up opportunistically if you're already editing this file; don't let it confuse you into thinking there are two different save paths.
- **Edit**: `BrandKitCard` → `BrandKitActions` (kebab menu) → opens `EditBrandDialog`, which calls the `updateBrandKit` server action (same shape, all fields optional via `UpdateBrandKitSchema = BrandKitSchema.partial()`).
- **Delete**: `BrandKitCard.handleDelete` calls `deleteBrandKit(id)` directly (no confirmation dialog, unlike Project delete which uses `window.confirm`).
- **Validation**: `lib/brand-kit/schema.ts` — Zod schema requiring `name` (2–100 chars), optional `url()` validation on `website`/`logoUrl` (accepting empty string via `.or(z.literal(""))`), free-text everything else, `language` defaulting to `"English"`.
- **Data mutation pattern**: this is the one module in the app built on **Server Actions** (`"use server"` in `lib/brand-kit/actions.ts`) rather than API routes — see [Section 5](#5-application-architecture). Each mutating action calls `revalidatePath("/brand-kit")`.
- **Unused helper files**: `lib/brand-kit/dto.ts` (response-shape types) and `lib/brand-kit/helpers.ts` (`serializeBrandKit(s)` — converts Dates to ISO strings) are not currently imported anywhere in the files exercised while building this handbook. If you need serialization for a new consumer (e.g., a future public API), these are the intended helpers — wire them in rather than writing new ones.
- **Not yet connected**: nothing in `lib/ai/prompt-builder.ts` reads Brand Kit fields. A Project can reference a Brand Kit, but generation in the Studio does not currently pull brand voice/tone/keywords into the Gemini prompt — see [Known Technical Debt](#28-known-technical-debt).

## 10. Projects Module

Purpose: group creations, optionally tag with a Brand Kit and a color.

- **List** (`/projects`): Server Component queries `prisma.project.findMany` with `include: { brandKit: {select:{id,name}}, _count: {select:{creations:true}} }`, ordered by `createdAt desc`. Renders `CreateProjectDialog` (header action) and a grid of `ProjectCard`.
- **Create**: `CreateProjectDialog` loads Brand Kit options via `GET /api/brand-kit` in a `useEffect`, then `POST /api/projects` on submit. Color is chosen from a fixed 6-swatch palette (`#7C3AED, #2563EB, #059669, #EA580C, #DC2626, #DB2777`) — this is a different set than the Prisma column default (`#3B82F6`) or the route handler's own fallback (`#7C3AED`).
- **Edit/Delete**: `ProjectCard` renders a kebab `ProjectActions` menu. Edit opens `EditProjectDialog` (`PATCH /api/projects/[id]`); Delete calls `window.confirm(...)` then `DELETE /api/projects/[id]`. Both call `router.refresh()` on success to re-pull the Server Component list — there is no optimistic update.
- **Detail** (`/projects/[id]`): Server Component fetches the project with all its `creations` (ordered `createdAt desc`), computes per-type counts client-side-in-render (`posts`/`carousels`/`stories`/`reels` via `.filter(...).length` over the already-fetched array — not separate queries), and lists each creation with a link to `/creations/[id]`. `notFound()` is called for a missing id. `EditProjectButton` wraps the same `EditProjectDialog` used on the list page.
- **`SelectProjectDialog`** (`components/projects/select-project-dialog.tsx`) is a distinct component used only from the Studio's `OutputPanel` when saving a creation with no project pre-selected — it lets the user pick an existing project or spawn `CreateProjectDialog`'s create flow inline, then calls back with the chosen `projectId`.

## 11. AI Studio Module

Route: `/studio` (`app/(dashboard)/studio/page.tsx`), wraps `StudioWorkspace` in `<Suspense>` (needed because it reads `useSearchParams()`).

Flow, end to end (`components/ai-studio/studio-workspace.tsx`):
1. Optional `?project=<id>` query param pre-selects a project — resolved to a display name via a client-side `GET /api/projects/:id` fetch (not passed as a server prop).
2. User picks a **source** (`topic` / `text` / `url` — `SourceSelector`), a **content type** (`post` / `carousel` / `story` / `reel` — `ContentTypeSelector`), and **generation settings** (`tone` select, `creativity` 0–100 slider — `GenerationSettings`).
3. `Generate` button → `POST /api/generate` with `{ sourceType, input, contentTypes: [mappedType], tone, creativity }`.
4. While in flight: `GenerationProgress` shows a fixed 3-step fake progress indicator driven by a hardcoded `progress={55}` prop (it is not wired to real request progress — see Known Technical Debt).
5. On success: result renders in `OutputPanel`, tabbed by format (`caption` / `carousel` / `story` / `reel`), with **Copy** (writes caption + formatted hashtags to clipboard) and **Save** actions.
6. **Save**: if a project is already selected (from the query param), saves immediately via `POST /api/creations`; otherwise opens `SelectProjectDialog` first. On success, toasts and `router.push("/creations/:id")`.
7. Changing any input (source type, source value, content type, tone, creativity) clears the currently generated content (`clearGeneratedContent`) so stale output can't be saved against new settings.

Only one content format is requested per generation call — switching the `ContentTypeSelector` and clicking Generate again re-calls the API rather than reusing a previous response, even though the API always returns all four formats.

## 12. Creation Details Module

Route: `/creations/[id]` (`app/(dashboard)/creations/[id]/page.tsx`), a Server Component.

- Fetches the `Creation` by id with `include: { project: true }`; `notFound()` if missing. Because `Creation.projectId` is nullable but the page unconditionally reads `creation.project.id`/`.name` for the breadcrumb, **a creation saved without a project would crash this page** — in practice this can't happen today because the Studio save flow always forces a project selection, but don't remove that constraint without also guarding this page.
- Renders the caption and the original prompt (read-only, in a `<pre>` block) in a left column.
- Header has **Edit** and **Copy Caption** buttons — both are **non-functional today** (no `onClick` handlers at all). Don't assume clicking them does anything; if asked to "fix the edit button," this is new-feature work, not a bug fix.
- Right column is `AIEditorPanel` — the AI Assistant chat (see next section).
- There is no view for the `hashtags`/`carousel`/`story`/`reel` JSON blobs stored on the Creation from this page — only `caption` and `prompt` are displayed. The rest of the generated payload is persisted but currently unreachable in the UI after saving.

## 13. AI Assistant Rewrite Flow

Component: `components/creations/ai-editor-panel.tsx` (`"use client"`), rendered only on the Creation detail page.

- **Not a real conversation.** State is a single `instruction` (input) and a single `response` (last rewrite) — there's no message history array, no persistence across reloads, and every send overwrites `response`.
- **Quick actions** (`✂️ Shorter`, `😂 Funny`, `🚀 Better Hook`, `💼 Professional`, `📱 Instagram`, `💼 LinkedIn`) each call `quickRewrite(fixedInstructionString)`, which POSTs to `/api/rewrite` with the *original, unmodified* `content` prop (the creation's current saved caption) plus the fixed instruction.
- **Custom instruction**: typing in the `Textarea` and hitting `Send` (or the send icon button) calls `rewrite()`, which does the same POST with the user's freeform instruction.
- **Accept Rewrite**: once a `response` exists, an `✅ Accept Rewrite` button appears; clicking it `PATCH`es `/api/creations/[id]/caption` with `{ caption: response }`, then calls `window.location.reload()` — a full hard reload, not a Next.js router refresh or local state update. This is why the page re-fetches the Creation from scratch after accepting.
- **No markdown rendering.** The response is shown in a plain `<p className="whitespace-pre-wrap">`. Despite the README's "AI Chat ... Supports markdown rendering using react-markdown, remark-gfm" claim, **neither package is installed** (check `package.json` — not present) nor used anywhere in this component. Treat that README section as aspirational/inaccurate.
- Minor state bug to be aware of: `rewrite()` clears `instruction` after sending (`setInstruction("")`), but `quickRewrite()` does not clear it (it briefly sets `instruction` to the fixed prompt string then leaves it there) — inconsistent but low-impact, since the textarea isn't the source of truth for what was sent.

## 14. Gemini Integration

Active implementation: `lib/ai/gemini.ts`, using `@google/generative-ai`'s `GoogleGenerativeAI` client.

- **Config**: `GEMINI_API_KEY` (required — throws `AIServiceError(..., 503)` if missing) and `GEMINI_MODEL` (optional, defaults to `"gemini-2.5-flash"`), both read directly from `process.env` at call time (not cached/module-level), so changing the env var takes effect on the next request without a code change.
- **Resilience pipeline (`lib/ai/gemini-provider.ts`)**: every Gemini text call in the app (Research, Planner, Visual Prompt Engine, Content Generator, Evaluation, AI Assistant rewrite) goes through `generateWithGemini`, which never lets a single transient upstream failure reach the caller. On a retryable error (`429`/`500`/`502`/`503`/`504`, or a network failure like `ECONNRESET`/`ETIMEDOUT`/a bare `fetch failed`) it retries the same key/model with exponential backoff (`500ms → 1s → 2s`, so 4 attempts total); once that's exhausted it rotates to the next configured key (`GEMINI_API_KEY_1..N`, see `loadApiKeys`); once every key is exhausted on the current model it falls back to the next model in the chain (`GEMINI_MODEL` → `GEMINI_MODEL_FALLBACKS` (comma-separated, optional) → the built-in `gemini-2.5-flash`/`gemini-2.0-flash` defaults, de-duplicated). Non-retryable errors (bad request, invalid key, safety block, parse failure) are never retried or rotated for — they fail immediately, since replaying them can't change the outcome. Every attempt/rotation is `console.log`/`console.warn`'d for internal debugging; only if every key and every model is exhausted does it throw a single friendly `AIServiceError` (`503`, generic "heavy demand" message) — **no raw `GoogleGenerativeAIError`/`GoogleGenerativeAIFetchError` message ever reaches a route handler's JSON response**: every call site (`lib/ai/gemini.ts`, `research.ts`, `planner.ts`, `evaluation.ts`, `visual-prompt.ts`) wraps its catch block in `toFriendlyAIServiceError` (`lib/ai/errors.ts`), which logs the real error server-side and substitutes a fixed, module-specific friendly message. `generateImageWithGemini` shares the same retry+key-failover treatment (no model fallback chain — image generation targets a single configured model, `GEMINI_IMAGE_MODEL`). Verify this behavior end-to-end (simulated `503`s, retry/key/model exhaustion) with `npm run verify:gemini-resilience` (`scripts/verify-gemini-resilience.ts`) — a standalone script, not part of the app's runtime or a real test suite (none exists yet, see [Known Technical Debt](#28-known-technical-debt)).
- **`generateInstagramContent(prompt: string)`**: calls `generateContent` with `generationConfig: { responseMimeType: "application/json" }`, so Gemini is asked to return JSON natively. The raw text response is still run through `extractJson()` (strips a possible ```` ```json ... ``` ```` fence) before `JSON.parse`, then validated against `generatedInstagramContentSchema` (Zod). Any failure at any stage (missing key, network/API error, empty text, invalid JSON, schema mismatch) throws a typed `AIServiceError` with an appropriate HTTP status (`503`/`502`) that the route handler forwards directly.
- **`rewriteContent(originalContent, instruction)`**: calls `generateContent` with a plain string prompt (no `responseMimeType`), instructing Gemini to "Return ONLY the rewritten content. No markdown. No explanation. No code block." Returns the trimmed text as-is — **no schema validation on this path**, since the output is a free-form string, not structured JSON.
- **Prompt construction**: `lib/ai/prompt-builder.ts`'s `buildInstagramContentPrompt` builds one big prompt string covering all four output formats (caption, hashtags, carousel, story, reel) regardless of which single format was actually requested — see [Section 11](#11-ai-studio-module). It has no knowledge of Brand Kit fields.
- **Alternate/unused provider**: `lib/ai/openrouter.ts` implements the same `generateInstagramContent` contract against OpenRouter's chat completions API (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL` — both present, commented out, in `.env.local`). It is a complete, working parallel implementation but **is not exported from `lib/ai/index.ts`** and nothing imports it. Treat it as an intentionally-shelved alternative, not a bug — don't silently wire it in without being asked, since the two providers have different validation guarantees (OpenRouter's path validates the JSON shape the same way; Gemini's rewrite path does not validate at all).
- **Error surface**: both providers define their own `AIServiceError` class (same shape, defined twice — once per file). The route handlers only import from `lib/ai` (i.e., the Gemini one), so this duplication is currently harmless but would need reconciling if OpenRouter is ever activated.

## 15. UI/UX Guidelines

- **Design system**: shadcn/ui `radix-nova` style (`components.json`), Tailwind v4 with CSS-variable-driven OKLCH color tokens defined in `app/globals.css` under `:root`/`.dark` and surfaced through `@theme inline`. Don't hardcode raw hex/oklch values in components for things that already have a semantic token (`bg-background`, `text-muted-foreground`, `border`, etc.) — the palette section is the exception, where the app intentionally uses a fixed brand-purple sequence (`#7C3AED` family) for user-facing color pickers.
- **Brand accent**: violet/indigo gradients (`from-violet-600 to-indigo-700` and similar) are the consistent "primary action" visual language — used for the main CTA buttons, the logo mark, active nav items, and generation-related surfaces. Reuse this pattern for new primary actions rather than introducing a new accent color.
- **Icons**: `lucide-react` exclusively.
- **Dark mode**: `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem` (`components/theme-provider.tsx`). Always style both light and dark via Tailwind's `dark:` variant or semantic tokens — don't assume light-only.
- **Toasts**: use `sonner`'s `toast.success(...)`/`toast.error(...)` for all async mutation feedback (this is the established pattern in every dialog/action in the Projects and Brand Kit modules) — the Creation/AI Assistant flow is a partial exception (it currently only `console.error`s failures instead of toasting them; consider that a gap, not a different intentional pattern, if you touch that file).
- **Empty states**: use the shared `EmptyState` component (icon + title + description + optional action) rather than ad hoc "no data" markup — it's already the pattern for zero-project, zero-brand-kit, and the whole `/history` page.
- **Page headers**: use the shared `PageHeader` component (`title`, `description`, optional `action` slot in the top-right) for every top-level dashboard page — every page under `(dashboard)` except the creation/project detail pages follows this.
- **Confirmation for destructive actions**: Project delete uses a blocking `window.confirm(...)`; Brand Kit delete does not. If asked to make destructive actions "safer," align Brand Kit delete to the Project pattern rather than introducing a third confirmation mechanism (e.g., a new `AlertDialog` flow) unless specifically asked to upgrade both.

## 16. Reusable Components

`components/ui/*` — generated shadcn/ui primitives (thin wrappers around Radix primitives + `cva` variants): `button`, `card`, `dialog`, `alert-dialog`, `dropdown-menu`, `select`, `tabs`, `switch`, `tooltip`, `avatar`, `badge`, `input`, `label`, `textarea`, `separator`, `sheet`, `skeleton`, `scroll-area`, `progress`, `navigation-menu`, `table`, `sonner`. Treat these as generated/vendored — prefer regenerating via the `shadcn` CLI over hand-editing when upgrading, unless you're intentionally customizing one.

`components/dashboard/*` — cross-cutting chrome: `DashboardShell` (sidebar + header + mobile sheet nav + theme menu, wraps every `(dashboard)` route), `PageHeader`, `EmptyState`.

**Orphaned components** (present on disk, not imported anywhere in the app as currently wired): `components/creations/caption-card.tsx`, `carousel-card.tsx`, `story-card.tsx`, `reel-card.tsx`, `creation-header.tsx`, `hashtags-card.tsx`. The Creation detail page and `OutputPanel` both render their equivalent UI inline instead of using these. Before deleting them, check whether they represent an intended-but-abandoned refactor (e.g., breaking `OutputPanel`'s large inline JSX into per-format cards) — that would be a reasonable direction to finish rather than discard, if asked to clean up the Creation/Studio UI.

## 17. Coding Standards

- **TypeScript everywhere**, `strict: true`. No `any` was observed in the files read for this handbook; prefer precise types (see `lib/ai/types.ts`, `components/ai-studio/types.ts`) over widening.
- **Path alias**: `@/*` maps to the repo root (`tsconfig.json`) — always import via `@/components/...`, `@/lib/...`, never relative paths across top-level folders.
- **`"use client"` boundary**: kept as small and as low in the tree as possible — pages default to Server Components; only components that need interactivity, browser APIs, or hooks are marked `"use client"`. Preserve this — don't blanket-convert a page to a client component just to add one interactive widget; extract the widget instead (this is the existing pattern for e.g. `StudioWorkspace`, `AIEditorPanel`, every dialog).
- **Formatting is inconsistent across files** — some modules (`lib/brand-kit/*`, `app/api/projects/*`, the project/brand-kit dialogs) use generously blank-line-separated, one-statement-per-line formatting; others (`components/ai-studio/*`, `output-panel.tsx`) are dense, near-single-line JSX. Match the style of the file you're editing rather than reformatting wholesale — don't run a repo-wide formatter pass as a side effect of a feature change.
- **No repo-wide code comments convention** — comments are sparse and used only for section labels inside long components (e.g., `{/* Breadcrumb */}`, `{/* Header */}` in `projects/[id]/page.tsx`). Keep new comments similarly minimal and structural, not explanatory.
- **Named exports** are standard for components and lib functions (`export function X`), not default exports, except where Next.js requires a default export (`page.tsx`, `layout.tsx`).

## 18. TypeScript Standards

- Domain types live close to their module: `lib/ai/types.ts` for AI I/O shapes, `components/ai-studio/types.ts` for Studio UI-level unions, `lib/brand-kit/dto.ts`/`schema.ts` for Brand Kit shapes. When adding a new field, update the type/schema in its owning module rather than inlining a new shape at the call site.
- **Zod is the source of truth where it exists**: `generateContentInputSchema`/`generatedInstagramContentSchema` (`lib/ai/schemas.ts`) and `CreateBrandKitSchema`/`UpdateBrandKitSchema` (`lib/brand-kit/schema.ts`) both use `z.infer`/`z.ZodType<T>` to keep the TS type and runtime validator locked together. Follow this pattern for new validated boundaries instead of maintaining a hand-written interface alongside a separate schema.
- **Prisma-generated types** (`@prisma/client`'s `Project`, `Creation`, `BrandKit`, `Prisma.BrandKitCreateInput`, etc.) are used directly as prop/DTO types in several places (e.g., `lib/brand-kit/dto.ts`, `brand-kit-card.tsx`'s inline prop type). Prefer this over redeclaring a parallel manual interface for the same shape.
- Route Handlers on the Projects/Creations side are **not** currently validated with Zod (unlike `/api/generate`) — bodies are read as `unknown`/loosely-typed and accessed with optional chaining (`body.name?.trim()`). If you hexpand these routes, consider whether adding a Zod schema matches the existing `/api/generate` pattern before inventing a new validation style.

## 19. Prisma Standards

- **Client**: always import the singleton from `@/lib/prisma` (`lib/prisma.ts`). It uses the `PrismaPg` driver adapter over `DIRECT_URL` (falling back to `DATABASE_URL`), and caches the instance on `globalThis` in non-production to survive Next.js dev hot-reload. Never instantiate `new PrismaClient()` elsewhere.
- **Config file, not just `schema.prisma`**: this project is on Prisma 7, which uses `prisma.config.ts` (not `package.json#prisma`) to declare the schema path (`prisma/schema.prisma`), migrations path (`prisma/migrations`), and datasource URL. Check the `prisma-upgrade-v7` / `prisma-cli` skills before assuming Prisma 5/6-era CLI flags or config locations apply.
- **IDs**: `String @id @default(cuid())` on every model — keep new models consistent with this rather than introducing `Int autoincrement()` or `uuid()`.
- **Relations use `onDelete: SetNull`** for both `Project → BrandKit` and `Creation → Project`, and both foreign keys are nullable. This is a deliberate "soft" relationship style in this schema — a parent being deleted does not cascade-delete or block-delete its children, it just detaches them. Follow this convention for new optional relations unless a feature explicitly needs cascade-delete or restrict semantics.
- **Indexes**: add `@@index([...])` on any new foreign key column and on any column you expect to sort/filter by at scale (mirroring `@@index([projectId])` / `@@index([createdAt])` on `Creation`).
- **Migrations**: use `prisma migrate dev` locally to generate a new migration folder under `prisma/migrations/`; don't hand-edit `schema.prisma` and expect the DB to follow without a migration. Two migrations exist today — treat the migration history as append-only.
- **JSON columns** (`hashtags`, `carousel`, `story`, `reel` on `Creation`) are read/written as opaque `Json?` with no Prisma-level shape enforcement — the Zod schemas in `lib/ai/schemas.ts` are the only structural guarantee, and only at generation time, not at save time (`POST /api/creations` doesn't re-validate these blobs before persisting).

## 20. API Development Standards

- **Route Handlers**, not a separate backend — colocate new endpoints under `app/api/<resource>/route.ts` (and `[id]/route.ts` for item-level operations), matching the existing Projects/Creations layout.
- **Response shape conventions observed today** (not fully consistent — pick the closest existing sibling endpoint as your template):
  - AI endpoints (`/api/generate`, `/api/rewrite`) return `{ data }` on success and `{ error, details? }` on failure, with meaningful HTTP status codes (`400`/`502`/`503`/`500`) via `AIServiceError`.
  - CRUD endpoints (`/api/projects*`) return the resource directly (no `{ data }` wrapper) on success, and `{ error }` on failure, generally with a blanket `500` regardless of the underlying cause (no differentiated status codes for e.g. not-found vs. validation).
  - `/api/creations` returns `{ success: true, id }`; `/api/creations/[id]/caption` returns `{ success: true, caption }`.
- **`runtime = "nodejs"`** is explicitly declared on the two AI routes (needed for the Gemini SDK / outbound fetch); follow this for any new route that calls an external SDK expecting the Node runtime.
- **Error handling is inconsistent** — most handlers wrap their body in `try/catch` and log with `console.error(error)` before returning a generic `500`; `PATCH /api/creations/[id]/caption` has no `try/catch` at all. When adding new routes, default to the `try/catch` + `console.error` + typed error response pattern used by the Projects routes, and treat the caption route's lack of one as a known gap, not a pattern to copy.
- **Params are async**: this Next.js version passes route params as `Promise<{...}>` — always `const { id } = await params` in dynamic route handlers, matching every existing `[id]/route.ts`.
- **No input validation library on CRUD routes today** except `/api/generate`. If a route accepts user-controlled data beyond simple string presence, prefer adding a Zod schema (matching the `lib/ai/schemas.ts` / `lib/brand-kit/schema.ts` style) over ad hoc manual checks.

## 21. Error Handling Standards

- **`AIServiceError`** (`lib/ai/gemini.ts`, duplicated in `lib/ai/openrouter.ts`) is the one structured error type in the codebase: `message`, `status` (HTTP code to surface), optional `cause`. Route handlers check `error instanceof AIServiceError` to decide whether to forward its status/message or fall back to a generic `500`. Use this pattern for any new external-service integration.
- **Everywhere else**, errors are handled ad hoc: `try/catch` + `console.error(error)` + a hardcoded generic message and status. There is no central logger, no error-reporting/monitoring integration (e.g., Sentry) wired in.
- **Client-side**, failures are surfaced via `sonner` toasts in the Projects/Brand Kit flows (`toast.error(error instanceof Error ? error.message : "...")`), but only `console.error`'d (no user-visible feedback) in `AIEditorPanel`'s rewrite/accept flows — that's a gap worth closing if you're already touching that component, not a pattern to replicate elsewhere.
- **Validation errors**: only `/api/generate` returns structured validation detail (`inputValidation.error.flatten()` under a `details` key). Other routes either don't validate or return a bare `{ error: string }`.

## 22. Security Considerations

- **No authentication/authorization anywhere** (see [Section 8](#8-authentication-flow)) — every API route and every page is fully open. Do not build a feature that assumes a request is "the owner" or "an admin"; there is no such concept yet.
- **No input sanitization beyond Zod/manual presence checks** — user-supplied `prompt`/`input` text is passed straight into the Gemini prompt string (`buildInstagramContentPrompt`) with simple string interpolation. This is a prompt-injection surface (a crafted "topic" or "reference URL" input could attempt to override the system instructions), but there's no mitigation in place today. If asked to harden generation, this is the place to look — not the DB layer.
- **No output sanitization on rendered AI content** — captions/rewrites are rendered as plain text (`whitespace-pre-wrap`/`whitespace-pre-line`), not `dangerouslySetInnerHTML`, so there's no active XSS vector from AI output today; keep it that way (don't introduce raw HTML rendering of model output without sanitization).
- **Secrets**: `GEMINI_API_KEY`, `DATABASE_URL`, `DIRECT_URL` (and the unused `OPENROUTER_API_KEY`) live in `.env`/`.env.local`, both gitignored (`.env*` in `.gitignore`). Never hardcode a key as a fallback in code, and never commit a `.env*` file.
- **No rate limiting** on the Gemini-backed routes — anyone with network access to the deployed app can drive unlimited (and unbilled-for-by-the-user) Gemini calls. Worth flagging if this app is ever exposed publicly.
- **CORS/origin restrictions**: `next.config.ts` only sets `allowedDevOrigins` for local network dev testing (`192.168.1.131`) — no production CORS policy is configured; Route Handlers are same-origin by default under Next.js unless explicitly opened up, which hasn't happened here.

## 23. Performance Considerations

- **No pagination** anywhere — `GET /api/projects`, the Project-detail creations list, and Brand Kit's `getBrandKits()` all `findMany` with no `take`/`cursor`. Fine at current data volumes; will need pagination before this scales to hundreds of rows per list.
- **Server Components fetch directly via Prisma** for the main list/detail pages — this avoids an extra network hop (no self-fetch of your own API) and is the correct pattern to keep following for new read-heavy pages, rather than having a Server Component call `fetch("/api/...")` against itself.
- **The Studio's project-name lookup** (`StudioWorkspace`'s `useEffect` hitting `GET /api/projects/:id`) is a clientside waterfall purely to resolve a name from an id already present in the URL — if this page is ever converted to accept the project as a server-rendered prop (e.g., via a nested route segment), that round trip could be eliminated.
- **`GenerationProgress` is decorative, not real** — its `progress` value is a hardcoded `55`, not tied to actual request/streaming progress. Don't rely on it to reason about real latency, and don't build new features assuming Gemini responses stream — they don't; `/api/generate` and `/api/rewrite` both await the full response before returning.
- **No caching layer** (no Next.js `fetch` cache tuning, no React Query despite it being installed, no Redis/edge cache) — every page load re-queries Postgres directly. Acceptable at current scale; revisit if traffic grows.

## 24. Git Workflow

- Single branch in use: `main` (tracks `origin/main`). No `develop`/feature-branch convention is evidenced in history — commits so far are made directly on `main` with descriptive `feat:`-prefixed (mostly) messages (e.g. `feat: integrate AI Studio with Projects`, `feat: complete projects module foundation`).
- No CI configuration exists (no `.github/workflows/`) and no pre-commit/pre-push hooks are configured — `lint`/`build` are manual (`npm run lint`, `npm run build`) with nothing enforcing them before a commit today. Don't assume a CI gate will catch a lint/type error; run `npm run lint` and `npm run build` yourself before considering a change done (see [Section 30](#30-definition-of-done-for-every-feature)).
- `prisma/migrations/` is checked in and should be treated as the append-only source of truth for schema history — never edit a migration file that's already been applied/committed; create a new migration instead.
- **Housekeeping note, not a rule to enforce silently**: `structure.txt` (a ~3MB generated directory dump) is currently tracked in git at the repo root. It's very likely an accidental commit rather than an intentional artifact. If you're asked to tidy up the repo, flag this to the user before deleting/untracking it (removing a tracked file is exactly the kind of action to confirm first, per your operating instructions) rather than assuming it's safe to drop.

## 25. Environment Variables

Defined across `.env` (committed-structure only, gitignored contents) and `.env.local`:

| Variable | Required | Used by | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | `lib/prisma.ts` (fallback), `prisma.config.ts` (fallback) | Postgres connection string (pooled, Supabase). |
| `DIRECT_URL` | Yes (preferred) | `lib/prisma.ts`, `prisma.config.ts` | Direct (non-pooled) Postgres connection — used in preference to `DATABASE_URL` for both the runtime client and Prisma CLI/migrations. |
| `GEMINI_API_KEY` | Yes, for generation/rewrite to work | `lib/ai/gemini-provider.ts` | Fills key slot 1 (equivalent to `GEMINI_API_KEY_1`). Missing key → `503 AIServiceError`, not a startup crash — the app boots fine without it, only AI calls fail. |
| `GEMINI_API_KEY_2` … `GEMINI_API_KEY_20` | No | `lib/ai/gemini-provider.ts` | Additional keys for the resilience pipeline's key-rotation failover (see [Section 14](#14-gemini-integration)) — add as many as you have, no renaming required. |
| `GEMINI_MODEL` | No | `lib/ai/gemini-provider.ts` | Primary text model. Defaults to `"gemini-2.5-flash"` if unset. |
| `GEMINI_MODEL_FALLBACKS` | No | `lib/ai/gemini-provider.ts` | Comma-separated model names tried, in order, after every key has failed on `GEMINI_MODEL` and on any prior fallback. Built-in defaults (`gemini-2.5-flash`, `gemini-2.0-flash`) are appended automatically. |
| `GEMINI_IMAGE_MODEL` | No | `lib/ai/gemini-provider.ts` | Image generation model. Defaults to `"gemini-2.5-flash-image"` if unset. |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | No (currently unused) | `lib/ai/openrouter.ts` | Present but commented out in `.env.local` — only relevant if the OpenRouter provider is ever wired back into `lib/ai/index.ts`. |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | N/A today | *(none — README template only)* | Listed in the README's env template for a future auth integration that does not exist in code yet. Don't add these to real `.env` files under the assumption they do anything today. |

No `.env.example` file exists in the repo — the README's env block is the only template; keep it updated if you add a new required variable.

## 26. Current Completed Features

Verified against the actual code (not just the README's roadmap claims):

- **Brand Kit**: full create/read/update/delete via Server Actions, list UI with empty state.
- **Projects**: full CRUD via REST routes, list + detail pages, optional Brand Kit association, creation counts.
- **AI Studio**: source selection (topic/text/url), content-type selection, tone/creativity controls, single-format Gemini generation, tabbed output preview, copy-to-clipboard, save-to-project (with inline "create project" fallback).
- **Creations**: persisted with full multi-format payload (caption/hashtags/carousel/story/reel), detail page rendering caption + original prompt.
- **AI Assistant rewrite**: quick-action and free-form single-turn rewrite via Gemini, accept-rewrite flow that persists the new caption and reloads the page.
- **Shell/UX**: collapsible sidebar, mobile nav sheet, light/dark/system theme toggle, toast notifications.

## 27. Planned Features

Per the README's roadmap section (not yet started in code, listed here for context, not as a promise of scope):
Manual Caption Editor, Version History, AI Image Generation, Social Media Publishing, Content Calendar, Analytics Dashboard, Team Collaboration, Approval Workflow, Multi-Brand Support. Actual authentication/session management should be added to this list in practice, even though the README frames it as already "completed" — see [Section 8](#8-authentication-flow).

## 28. Known Technical Debt

- **Dashboard home page is fully mock data.** `app/(dashboard)/page.tsx`'s stats cards and "Recent creations" list are hardcoded arrays, not queried from the database. Anyone asked to "fix the dashboard numbers" should treat this as a build-it task, not a bug fix.
- **`/history` is unimplemented** — it renders only a static `EmptyState`, with no query, no filtering, no data model distinction from "all creations."
- **`/settings` is fully static and non-persisted** — the notification/desktop-experience `Switch`es use `defaultChecked` with no state or backend, and "Profile"/"Appearance" rows are descriptive text only.
- **Brand Kit data does not influence generation.** A Project can reference a Brand Kit, but `buildInstagramContentPrompt` never reads Brand Kit fields (tone, keywords, avoid-words, etc.) — the core "brand-safe content" value proposition (see [Section 2](#2-business-goal)) is not actually wired end-to-end yet.
- **Two parallel, inconsistent "default project color" values** exist across the Prisma schema default (`#3B82F6`), the `/api/projects` POST fallback (`#7C3AED`), and the client-side swatch palettes (`#7C3AED` first of six). Pick one source of truth if this is ever touched.
- **Dead/orphaned code**: `lib/ai/openrouter.ts` (unused alternate provider), `components/creations/{caption-card,carousel-card,story-card,reel-card,creation-header,hashtags-card}.tsx` (unused, superseded by inline rendering in `OutputPanel`), a commented-out duplicate `save()` in `create-brand-dialog.tsx`, and a `test-gemini.js` entry in `tsconfig.json`'s `include` array pointing at a file that no longer exists in the repo.
- **`structure.txt`** (~3MB) is committed to git at the repo root — almost certainly an accidental commit of a generated directory listing; flag before removing (see [Git Workflow](#24-git-workflow)).
- **README drift**: claims Next.js 15 (actual: 16.2.11), claims `react-markdown`/`remark-gfm`-powered AI chat rendering (neither package exists in `package.json`, and the rewrite panel renders plain text), and frames Authentication as a completed feature (it does not exist). Treat `README.md` as a product pitch, not a spec — this file (`CLAUDE.md`) is the accurate technical reference.
- **No tests, no CI.** No test runner is installed, no `*.test.*`/`*.spec.*` files exist, and there is no `.github/workflows/`. `npm run lint` and `npm run build` are the only available correctness gates today.
- **Installed-but-unused dependencies**: `zustand`, `@tanstack/react-query` (+ devtools), `react-hook-form` + `@hookform/resolvers`, `framer-motion` — present in `package.json` but not exercised by any file read while building this handbook. If you reach for one of these, you're likely introducing a new pattern to the codebase, not following an existing one — do so deliberately and be ready to justify the choice over the current hand-rolled `useState`/`fetch` approach.
- **Error UX gap in the AI Assistant panel** — failed rewrite/accept calls are only `console.error`'d, with no toast or inline error shown to the user, unlike every other mutation flow in the app.

## 29. Things You Must Never Change Without Explicit Permission

- **Do not silently "fix" the README** to match the code, or vice versa, as a side effect of an unrelated task — the drift is documented in Known Technical Debt; correcting it is a deliberate, separate decision the user should make.
- **Do not add authentication, a `User` model, or any per-user scoping to existing models** as a byproduct of another feature. This is a foundational architecture decision (migration strategy, session strategy, and a pass over every existing query) — surface it as its own proposal first.
- **Do not switch the active AI provider** (i.e., start using `lib/ai/openrouter.ts` in place of `lib/ai/gemini.ts`, or vice versa) without being explicitly asked — the two have different validation guarantees and different configured env vars, and swapping providers changes cost/behavior in ways the user needs to decide on.
- **Do not delete or rewrite existing Prisma migrations** (`prisma/migrations/20260724142020_init`, `20260726085635_add_brand_kit`). Schema changes must be new, additive migrations.
- **Do not change the `onDelete: SetNull` relation semantics** on `Project.brandKit` or `Creation.project` to `Cascade`/`Restrict` without explicit confirmation — this would silently start destroying data (creations/projects) that currently survives a parent delete.
- **Do not remove `structure.txt` or any other unexpected-looking committed file** without first asking the user — it may be an accidental commit, but it could also be intentional (e.g., used by some external tool); confirm before deleting tracked files that aren't part of the task at hand.
- **Do not reformat whole files** (whitespace/style-only diffs) as a side effect of a feature or bug-fix commit — the codebase's formatting is already inconsistent between modules; a drive-by reformat just adds unrelated diff noise. Match the surrounding style within the lines you're actually changing.
- **Do not bypass or "simplify away" the Zod validation** on `/api/generate` (input or output schema) — the output-schema check in particular is the only safety net preventing a malformed Gemini response from being persisted to a `Creation` or shown to the user as if it were structurally valid.

## 30. Definition of Done for Every Feature

A change in this repo is done when:

1. **It matches the existing pattern for its module** — REST route handlers for Projects/Creations, Server Actions for Brand Kit (see [Section 5](#5-application-architecture)); don't introduce a third pattern for an existing resource.
2. **Types and validation are updated together** — if you touch a Zod schema (`lib/ai/schemas.ts`, `lib/brand-kit/schema.ts`), the corresponding TS type (`z.infer`) and every call site consuming it compile cleanly.
3. **`npm run lint` passes** with no new warnings/errors in touched files.
4. **`npm run build`** (`next build --webpack`) succeeds — this project explicitly builds with Webpack, not Turbopack (see `package.json`'s `build` script), so don't assume Turbopack-specific behavior applies.
5. **Prisma is in sync**: if `prisma/schema.prisma` changed, a corresponding migration exists under `prisma/migrations/` and `prisma generate` has been run so `@prisma/client` types match.
6. **Server/Client boundaries are respected** — no new unnecessary `"use client"` directives on components that don't need interactivity or browser APIs; data-fetching for initial page render stays in Server Components where the page already does that.
7. **Error paths return the established shape for their module** (see [Section 20](#20-api-development-standards)) and are user-visible where the module's convention is to toast (Projects/Brand Kit) — don't leave a new mutation silently failing to `console.error` only, unless you're intentionally matching the (already-flagged-as-a-gap) `AIEditorPanel` pattern.
8. **No secrets, API keys, or `.env*` contents are committed.**
9. **For UI-facing changes**: the feature has actually been exercised in the running app (`npm run dev`), in both light and dark theme, not just type-checked — this codebase has a history of decorative-only controls (dashboard stats, Edit/Copy buttons on the Creation page, the Settings switches); don't add another one by leaving a control wired to nothing.
10. **The change doesn't quietly expand the blast radius of the "no auth" gap** — e.g., don't add a new mutation endpoint that assumes a `userId` will "just be added later"; build for the current single-tenant reality unless the task is explicitly to begin multi-tenancy.
