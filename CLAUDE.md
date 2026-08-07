@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> This is the permanent engineering handbook for **UnfilterdTech AI Studio**. It documents the codebase as it actually exists today — not the aspirational feature set described in `README.md`. Where the two disagree, this file calls it out explicitly. Keep this document in sync with the code as the project evolves.

---

## 1. Project Overview

UnfilterdTech AI Studio is a single-tenant, AI content **automation** platform (not a chatbot) for social media content (Instagram posts, carousels, stories, and reels) using Google Gemini. A user defines a **Brand Kit** (voice, tone, colors, keywords), organizes work into **Projects**, generates content end-to-end in the **AI Studio**, saves the result as a **Creation**, and reviews it on a dedicated **Review page** (Section 12) — where the only ways to change the output are a full one-click **Regenerate** or manual field edits, never a conversational AI chat (that flow existed as an "AI Assistant" panel and has been removed — see Section 12).

The app is currently built and used as a single-user workspace (there is no multi-tenant account system — see [Section 8, Authentication Flow](#8-authentication-flow)).

## 2. Business Goal

Give solo creators and small marketing teams a fast path from a raw idea (a topic, a block of text, or a reference URL) to a polished, on-brand, multi-format social media draft, without needing a copywriter for the first pass. The product bets on two things:

- **Brand consistency**: Brand Kit voice/tone/keywords are automatically fed into every generation prompt (Section 12c) so every output matches a defined voice — with one gap: the Brand Kit's *visual* config (logo, watermark, safe margin, fonts) is not yet composited onto generated images (Section 12c, [Known Technical Debt](#28-known-technical-debt)).
- **Iteration speed**: the Review page's single **Regenerate** action (Section 12a) reruns the entire pipeline — caption, hook, CTA, hashtags, carousel/story/reel content, image prompts, and images — in one click, with no "what do you want to change?" step.

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
│   ├── creations/[id]/page.tsx   # "/creations/:id" — Review page (Section 12)
│   ├── brand-kit/page.tsx        # "/brand-kit" — brand kit list/CRUD
│   ├── history/page.tsx          # "/history" — static empty state only, not implemented
│   └── settings/page.tsx         # "/settings" — static, non-persisted UI only
├── api/                          # Route Handlers (REST-style JSON endpoints)
│   ├── generate/route.ts         # POST — Gemini content generation
│   ├── projects/route.ts         # GET, POST
│   ├── projects/[id]/route.ts    # GET, PATCH, DELETE
│   ├── creations/route.ts        # POST (save a generated creation — also triggers image generation)
│   ├── creations/[id]/regenerate/route.ts  # POST — full-pipeline one-click regenerate (Section 12a)
│   ├── creations/[id]/status/route.ts      # PATCH — Approve & Publish / Schedule status scaffold (Section 12b)
│   └── brand-kit/route.ts        # GET (id/name list only — full CRUD is server actions, see below)
├── layout.tsx                    # Root layout: <html>, ThemeProvider, TooltipProvider, Toaster
└── globals.css                   # Tailwind v4 theme tokens (OKLCH colors, radii)

components/
├── ai-studio/                    # Studio workspace: source/content selectors, settings, output, progress
├── brand-kit/                    # Brand Kit list/cards/forms/dialogs (server-action driven)
├── creations/                    # Review page pieces (Section 12) — review-action-bar, developer-details, generated-images-gallery, creation-actions (header buttons), etc.
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

- **Next.js App Router, mixed rendering strategy.** Read-heavy pages (`/projects`, `/projects/[id]`, `/creations/[id]`, `/brand-kit`) are **Server Components** that call `prisma` (or a Brand Kit server action) directly at render time — there is no client-side data fetching for the initial page load on these routes. Interactive pieces (dialogs, the Studio workspace, the Review page's action bar) are `"use client"` islands nested inside those server-rendered pages.
- **Two coexisting mutation patterns** — know which one applies before adding a feature:
  - **Projects and Creations** are mutated through classic REST **Route Handlers** under `app/api/**/route.ts`, called from client components via `fetch`. Client components call `router.refresh()` after a successful mutation to re-pull the Server Component data rather than managing their own cache.
  - **Brand Kit** is mutated through **Next.js Server Actions** (`"use server"` functions in `lib/brand-kit/actions.ts`) called directly from client components inside `startTransition`, with `revalidatePath("/brand-kit")` on the server side. There is a `GET /api/brand-kit` route, but it exists only to power `<select>` dropdowns elsewhere (Projects dialogs), not for CRUD.
  - Do not blend the two patterns for the same resource. If you extend Brand Kit, keep using server actions; if you extend Projects/Creations, keep using route handlers.
- **AI generation is stateless request/response.** `POST /api/generate` runs the full Research → Planner → Visual Prompt → Content pipeline and returns it in one response. There is no streaming, no server-side session/history of generations, and — since the AI Assistant chat panel was removed (Section 12) — no conversational multi-turn flow anywhere in the app. The only way to change already-generated content is `POST /api/creations/[id]/regenerate` (Section 12a), which reruns the entire pipeline fresh; there is no partial/instructed rewrite endpoint anymore.
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
| `status` | `CreationStatus` (`DRAFT \| APPROVED \| SCHEDULED \| PUBLISHED`) | default `DRAFT`; set via `PATCH /api/creations/[id]/status` from the Review page's bottom action bar. **Status scaffold only — no real publishing integration exists** (Section 12b). |
| `scheduledAt` | `DateTime?` | set only when `status = SCHEDULED`; cleared for every other status |
| `tone` | `String?` | free text, from the Studio's tone select |
| `creativity` | `Int?` | 0–100 slider value |
| `caption` | `String @db.Text` | overwritten wholesale by `POST /api/creations/[id]/regenerate` (Section 12a) — there is no partial/instructed edit path anymore, only full regeneration or the manual Edit dialog |
| `hashtags` | `Json?` | array of strings, stored as JSON |
| `carousel` | `Json?` | array of `{slideNumber, headline, body, visualSuggestion}` |
| `story` | `Json?` | array of `{frameNumber, text, visualSuggestion}` |
| `reel` | `Json?` | `{hook, script, scenes: [{sceneNumber, visual, narration}]}` |
| `model` | `String?` | defaults to `"Gemini"`, set by the client, not derived server-side |
| `createdAt`, `updatedAt` | `DateTime` | |
| `@@index([projectId])`, `@@index([createdAt])`, `@@index([status])` | | |

This table omits `researchId`/`plannerId`/`visualPromptId` (FKs into the Research/Planner/Visual Prompt cache models) and `qualityScore`/`suggestions` (AI evaluation output) — all pre-date this handbook section being written and are exercised throughout Section 12.

Note: even though a Studio session only requests **one** content format at a time (`contentTypes: [apiContentTypeByContentType[contentType]]`), the Gemini prompt always instructs the model to populate `caption`, `hashtags`, `carousel`, `story`, and `reel` regardless of which format was requested, and all of it gets persisted on save. There's no per-request slimming — every `Creation` row carries the full multi-format payload.

## 7. API Routes

All routes are plain Next.js **Route Handlers** (`app/api/**/route.ts`), not `tRPC`/GraphQL. None of them currently perform authentication/authorization checks (see [Section 8](#8-authentication-flow)) or rate limiting.

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| `POST` | `/api/generate` | `{ sourceType, input, contentTypes, tone, creativity }` (validated by `generateContentInputSchema`) | `200 { data: GeneratedInstagramContent }` | `runtime = "nodejs"`. Errors: `400` bad JSON/invalid input, `502` Gemini call failed or returned unparsable/invalid-shape JSON, `503` missing `GEMINI_API_KEY`, `500` fallback. |
| `GET` | `/api/projects` | — | `200 Project[]` ordered by `createdAt desc` | No pagination. |
| `POST` | `/api/projects` | `{ name, description?, color?, brandKitId? }` | `201 Project` | `400` if `name` is empty after trim. `color` defaults to `"#7C3AED"` server-side (note this differs from the Prisma schema's own default of `#3B82F6`, and from the client's own default swatch — three different "default color" values exist across the stack). |
| `GET` | `/api/projects/[id]` | — | `200 Project` | `404` if not found. |
| `PATCH` | `/api/projects/[id]` | `{ name, description, color, brandKitId? }` | `200 Project` | No partial-update guarding — passes all fields straight through to `prisma.update`; passing `undefined` for a field will still be accepted by Prisma as "no change" but there's no schema validation on this endpoint. |
| `DELETE` | `/api/projects/[id]` | — | `200 { success: true }` | Deleting a project cascades to nothing explicitly protected — `Creation.projectId` is `onDelete: SetNull`, so its creations survive as project-less. |
| `POST` | `/api/creations` | `{ projectId?, title, prompt, contentType, tone?, creativity?, caption, hashtags?, carousel?, story?, reel?, model? }` | `200 { success: true, id }` | `contentType` (lowercase UI string) is mapped to the Prisma enum via `contentTypeMap`; an unrecognized value silently maps to `undefined` and will throw inside Prisma, caught by the generic `500` handler. No Zod validation on this route. |
| `POST` | `/api/creations/[id]/regenerate` | — (no body) | `200 { success: true, id }` | `runtime = "nodejs"`. Reruns Research → Planner → Visual Prompt → Content → Images fully fresh (Section 12a) and overwrites the creation. `404` if missing, `502` if the regenerated content fails schema validation, `503`/`502` mirroring `AIServiceError` on a Gemini failure. |
| `PATCH` | `/api/creations/[id]/status` | `{ status: CreationStatus, scheduledAt?: ISO string }` (Zod-validated; `scheduledAt` required + must be future when `status="SCHEDULED"`) | `200 { success: true, status, scheduledAt }` | Section 12b — status-tracking scaffold only, **does not actually publish anything**. `404` if missing. |
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
- **Connected for prompt guidance, not yet for image compositing**: `buildInstagramContentPrompt` (and the Planner/Visual Prompt prompt builders) accept a `brandContext` string built by `buildBrandContext` (`lib/ai/brand-context.ts`) from a Project's Brand Kit and prepend it to every prompt — voice/tone/keywords/CTA-style/avoid-words do reach Gemini automatically. What's still missing is the *visual* side: the logo/watermark/font/color renderer (`lib/creative-renderer/`) is never invoked, so generated images carry no Brand Kit overlay — see Section 12c and [Known Technical Debt](#28-known-technical-debt).

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

## 12. Creation Details Module — the Review Page

Route: `/creations/[id]` (`app/(dashboard)/creations/[id]/page.tsx`), a Server Component.

**Product philosophy (deliberate, not incidental):** this is an AI content *automation* platform, not an AI chatbot. The journey is `Topic/URL → AI generates everything → user reviews → approve → publish`, and a user should never need to manually prompt the AI after the initial generation. The Creation page is framed as a **Review page** — glanceable in under ~20 seconds, not a workspace for hand-editing AI output. There used to be a persistent "AI Assistant" chat panel here for conversational rewriting; it has been **entirely removed** (component, route, backend function, all of it — see the "no manual AI editing" note below) in favor of a single **Regenerate** action. If a user dislikes the output, the answer is always "click Regenerate," never "chat with the AI to fix it."

- Fetches the `Creation` by id with `include: { project: { include: { brandKit } }, research, planner, visualPrompt }`; `notFound()` if missing.
- **Header**: title, content type / date / Brand Kit badge, and a row of compact outline buttons in the top-right (`CreationActions`, `components/creations/creation-actions.tsx`) — Edit / Duplicate / Copy Caption / Copy All / Download, wrapping naturally on narrow screens. Deliberately **not** a dropdown/kebab menu — these are frequently-used utilities, and "frequently used" means no extra click to reach them, even though they're secondary to (and visually lighter than) the primary bottom action bar below.
- **Body — four sections, in this order**, everything else collapsed away:
  1. **Generated Content** — `GeneratedContentSections` (shared with the Studio's live preview), but with a trimmed `tabs` prop (`["caption", "carousel", "stories", "reel"]` — no "Hashtags" or "Post" tabs, since those get their own sections below).
  2. **Generated Images** — `GeneratedImagesGallery` (`components/creations/generated-images-gallery.tsx`), a **read-only** grid fetched from `GET /api/visual-prompts/[id]/images`. No edit-prompt or per-slot regenerate controls here — those live under Developer Details (see below). Images are meant to already exist by the time a creator reaches this page (see "Brand Kit / image auto-generation" below); an empty gallery here means either a pre-this-feature creation or a failed generation, both fixed by clicking Regenerate.
  3. **Hashtags** — `HashtagsCard`, shown only when hashtags exist.
  4. **Publishing Preview** — `PostCard` (caption + formatted hashtags as they'd appear as an Instagram post). This is the closest thing to a "what will actually get published" mockup today; it does **not** render the generated images inline (no composited final post preview) — see Known Technical Debt.
- **Developer Details** (`components/creations/developer-details.tsx`) — one `CollapsibleSection`, **collapsed by default**, titled "Developer Details," containing everything a normal creator never needs: Prompt Used (raw source text sent to Gemini), `ResearchPanel`, `PlannerPanel`, `KeywordPanel`, `QualityScorePanel`, `SuggestionsPanel`, and the full `VisualAssetsPanel` (per-image AI prompts, Edit Prompt, per-slot manual Generate/Regenerate — the old individually-editable image workflow). None of the backend logic behind any of this was deleted or changed by moving it here; only where it renders changed.
- **Bottom Action Bar** (`ReviewActionBar`, `components/creations/review-action-bar.tsx`) — sticky to the bottom of the viewport, exactly four actions: **Approve & Publish**, **Schedule**, **Regenerate**, **Delete**. See Sections 12a/12b below.

### 12a. Regenerate — the entire creation, one click

`POST /api/creations/[id]/regenerate` (`app/api/creations/[id]/regenerate/route.ts`). No "what do you want to change?" prompt — reruns the full pipeline (Research → Planner → Visual Prompt → Content → Images) and overwrites the creation's caption/hashtags/carousel/story/reel/qualityScore/suggestions plus every relevant generated image, in one request.

- **Forces every cache stage fresh.** `getOrCreateResearch`/`getOrCreatePlanner`/`getOrCreateVisualPrompt` (`lib/research/service.ts`, `lib/planner/service.ts`, `lib/visual-prompt/service.ts`) each take a `{ forceRegenerate?: boolean }` second argument — when true, the cache lookup is skipped entirely and the new row is persisted under a randomized key (`regen:${randomUUID()}`) instead of the deterministic content-hash key. This matters because Research/Planner/VisualPrompt rows are a **cross-creation** cache (see Section 6) — calling the normal cached path again would almost always return byte-identical content, or worse, silently mutate what some *other* creation sharing that cache key is showing. A forced regeneration always creates new rows and repoints this Creation's `researchId`/`plannerId`/`visualPromptId` at them; the old rows are left untouched.
- **Images regenerate too**, via the shared `generateImagesForCreation` helper (`lib/image-generation/generate-for-creation.ts`) with `forceRegenerate: true` — every slot relevant to the creation's `contentType` (one for POST, two for STORY/REEL, one per slide for CAROUSEL) is regenerated in parallel. Best-effort per slot (a single provider failure just leaves that slot `FAILED`, never blocks the others).
- `sourceType` isn't persisted on `Creation` (only the raw `prompt` text is) — regeneration always assumes `"topic"`. Low-risk: it only affects one descriptive line in the generation prompt, not the source text itself.
- Not cheap: worst case this is 4 sequential Gemini text calls (each with its own retry/key/model resilience — see Section 14) plus up to several parallel Gemini image calls. Expect several seconds to tens of seconds, not instant.

### 12b. Approve & Publish / Schedule — status scaffold, not real publishing

`Creation.status` (`CreationStatus`: `DRAFT | APPROVED | SCHEDULED | PUBLISHED`, default `DRAFT`) and `Creation.scheduledAt` (`DateTime?`), updated via `PATCH /api/creations/[id]/status` (`app/api/creations/[id]/status/route.ts`).

**There is no real social-publishing integration anywhere in this codebase** — no OAuth, no Instagram/LinkedIn/etc. Graph API calls, nothing under Planned Features (Section 27) has been started. "Approve & Publish" marks the creation `PUBLISHED` immediately; "Schedule" (a small dialog with a native `<input type="datetime-local">`, no calendar picker dependency) marks it `SCHEDULED` with a future `scheduledAt`. **Neither action actually posts anything anywhere.** This is a deliberate, explicit status-tracking scaffold for a future real integration, not a claim that publishing happened — don't build on top of it assuming real delivery exists, and don't let a future feature silently start treating `PUBLISHED` as "this went out to a platform" without adding the actual integration first.

### 12c. Brand Kit — automatically applied to *generation*, not yet to *image compositing*

Per the product philosophy, Brand Kit application must be fully automatic — no manual logo/font/color step. Two different things are bundled under "Brand Kit," with two different levels of automation today:

- **Prompt-level guidance (fully automatic, already wired):** `loadBrandContext` (`lib/brand-kit/load-context.ts`) resolves a Project's Brand Kit into a formatted context string (`buildBrandContext`, `lib/ai/brand-context.ts`) that's fed automatically into the Planner, Visual Prompt Engine, and Content Generator prompts — tone, writing style, CTA style, keywords, avoid-words, and colors (as descriptive text) all shape the generated caption/hook/CTA without any manual step. This has always been true of the current (Research → Planner → Visual Prompt → Content) pipeline, contrary to the outdated claim in Section 28 below.
- **Pixel-level compositing (schema-ready, NOT wired in — known gap):** `BrandKit` has a full creative-rendering config (`logoUrl`/`watermarkLogoUrl`/`watermarkEnabled`, `logoPosition`, `safeMargin`, `headingFont`/`bodyFont`, `overlayOpacity`, `textStyle`, `layoutStyle`, `iconStyle`, `primaryColor`/`secondaryColor`/`accentColor`), and a matching renderer (`lib/creative-renderer/` — `compositor.ts`, `logo-placement.ts`, `text-renderer.ts`, `color-analysis.ts`, `fonts.ts`) that can composite a logo/watermark/text block onto a base image respecting all of the above. **Nothing in the app ever calls it.** `generateImageForSlot` (`lib/image-generation/service.ts`) persists the raw provider image (Gemini/FLUX) as-is — no logo, no watermark, no brand color/font overlay is ever actually drawn onto a generated image today. The renderer is also built entirely against the browser Canvas API (`CanvasRenderingContext2D`, `HTMLImageElement`, `new Image()` in `load-image.ts`) with no Node canvas package installed, so it can't be called from the (Node-runtime) image generation route as-is — wiring it in means either running it client-side as a post-generation compositing pass, or adding a server-side canvas dependency (e.g. `@napi-rs/canvas`). Treat this as a real, scoped follow-up task, not a quick fix — flag it rather than silently building either direction.

There is no manual UI anywhere for placing a logo, picking a font, or choosing per-image colors on a Creation — that part of the "no manual" requirement is already satisfied by omission; the gap is that the *automatic* application doesn't actually happen yet for image compositing.

## 14. Gemini Integration

Active implementation: `lib/ai/gemini.ts`, using `@google/generative-ai`'s `GoogleGenerativeAI` client.

- **Config**: `GEMINI_API_KEY` (required — throws `AIServiceError(..., 503)` if missing) and `GEMINI_MODEL` (optional, defaults to `"gemini-2.5-flash"`), both read directly from `process.env` at call time (not cached/module-level), so changing the env var takes effect on the next request without a code change.
- **Resilience pipeline (`lib/ai/gemini-provider.ts`)**: every Gemini text call in the app (Research, Planner, Visual Prompt Engine, Content Generator, Evaluation) goes through `generateWithGemini`, which never lets a single transient upstream failure reach the caller. On a retryable error (`429`/`500`/`502`/`503`/`504`, or a network failure like `ECONNRESET`/`ETIMEDOUT`/a bare `fetch failed`) it retries the same key/model with exponential backoff (`500ms → 1s → 2s`, so 4 attempts total); once that's exhausted it rotates to the next configured key (`GEMINI_API_KEY_1..N`, see `loadApiKeys`); once every key is exhausted on the current model it falls back to the next model in the chain (`GEMINI_MODEL` → `GEMINI_MODEL_FALLBACKS` (comma-separated, optional) → the built-in `gemini-2.5-flash`/`gemini-2.0-flash` defaults, de-duplicated). Non-retryable errors (bad request, invalid key, safety block, parse failure) are never retried or rotated for — they fail immediately, since replaying them can't change the outcome. Every attempt/rotation is `console.log`/`console.warn`'d for internal debugging; only if every key and every model is exhausted does it throw a single friendly `AIServiceError` (`503`, generic "heavy demand" message) — **no raw `GoogleGenerativeAIError`/`GoogleGenerativeAIFetchError` message ever reaches a route handler's JSON response**: every call site (`lib/ai/gemini.ts`, `research.ts`, `planner.ts`, `evaluation.ts`, `visual-prompt.ts`) wraps its catch block in `toFriendlyAIServiceError` (`lib/ai/errors.ts`), which logs the real error server-side and substitutes a fixed, module-specific friendly message. `generateImageWithGemini` shares the same retry+key-failover treatment (no model fallback chain — image generation targets a single configured model, `GEMINI_IMAGE_MODEL`). Verify this behavior end-to-end (simulated `503`s, retry/key/model exhaustion) with `npm run verify:gemini-resilience` (`scripts/verify-gemini-resilience.ts`) — a standalone script, not part of the app's runtime or a real test suite (none exists yet, see [Known Technical Debt](#28-known-technical-debt)).
- **`generateInstagramContent(prompt: string)`**: calls `generateContent` with `generationConfig: { responseMimeType: "application/json" }`, so Gemini is asked to return JSON natively. The raw text response is still run through `extractJson()` (strips a possible ```` ```json ... ``` ```` fence) before `JSON.parse`, then validated against `generatedInstagramContentSchema` (Zod). Any failure at any stage (missing key, network/API error, empty text, invalid JSON, schema mismatch) throws a typed `AIServiceError` with an appropriate HTTP status (`503`/`502`) that the route handler forwards directly.
- **Prompt construction**: `lib/ai/prompt-builder.ts`'s `buildInstagramContentPrompt` builds one big prompt string covering all four output formats (caption, hashtags, carousel, story, reel) regardless of which single format was actually requested — see [Section 11](#11-ai-studio-module). It accepts an optional `brandContext` string (built by `buildBrandContext`) and prepends it when present — see Section 9 and 12c.
- **Alternate/unused provider**: `lib/ai/openrouter.ts` implements the same `generateInstagramContent` contract against OpenRouter's chat completions API (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL` — both present, commented out, in `.env.local`). It is a complete, working parallel implementation but **is not exported from `lib/ai/index.ts`** and nothing imports it. Treat it as an intentionally-shelved alternative, not a bug — don't silently wire it in without being asked, since the two providers have different validation guarantees (OpenRouter's path validates the JSON shape the same way; Gemini's rewrite path does not validate at all).
- **Error surface**: both providers define their own `AIServiceError` class (same shape, defined twice — once per file). The route handlers only import from `lib/ai` (i.e., the Gemini one), so this duplication is currently harmless but would need reconciling if OpenRouter is ever activated.

## 15. UI/UX Guidelines

- **Design system**: shadcn/ui `radix-nova` style (`components.json`), Tailwind v4 with CSS-variable-driven OKLCH color tokens defined in `app/globals.css` under `:root`/`.dark` and surfaced through `@theme inline`. Don't hardcode raw hex/oklch values in components for things that already have a semantic token (`bg-background`, `text-muted-foreground`, `border`, etc.) — the palette section is the exception, where the app intentionally uses a fixed brand-purple sequence (`#7C3AED` family) for user-facing color pickers.
- **Brand accent**: violet/indigo gradients (`from-violet-600 to-indigo-700` and similar) are the consistent "primary action" visual language — used for the main CTA buttons, the logo mark, active nav items, and generation-related surfaces. Reuse this pattern for new primary actions rather than introducing a new accent color.
- **Icons**: `lucide-react` exclusively.
- **Dark mode**: `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem` (`components/theme-provider.tsx`). Always style both light and dark via Tailwind's `dark:` variant or semantic tokens — don't assume light-only.
- **Toasts**: use `sonner`'s `toast.success(...)`/`toast.error(...)` for all async mutation feedback — this is the established pattern in every dialog/action in the Projects, Brand Kit, and Review page (`ReviewActionBar`) modules.
- **Empty states**: use the shared `EmptyState` component (icon + title + description + optional action) rather than ad hoc "no data" markup — it's already the pattern for zero-project, zero-brand-kit, and the whole `/history` page.
- **Page headers**: use the shared `PageHeader` component (`title`, `description`, optional `action` slot in the top-right) for every top-level dashboard page — every page under `(dashboard)` except the creation/project detail pages follows this.
- **Confirmation for destructive actions**: every delete flow (Project card, Brand Kit card, Brand Kit detail page, Review page) uses the same `AlertDialog` confirm pattern — title naming the item, a "cannot be undone" description noting what gets unlinked (not deleted) as a side effect, disabled Cancel/confirm buttons while the request is in flight, and a `toast` on both success and failure. Brand Kit's list-card delete used to skip this entirely (a single click deleted immediately, no confirmation, no error handling) — fixed; if you add a new delete affordance anywhere, match this pattern rather than inventing a fourth one.

## 16. Reusable Components

`components/ui/*` — generated shadcn/ui primitives (thin wrappers around Radix primitives + `cva` variants): `button`, `card`, `dialog`, `alert-dialog`, `dropdown-menu`, `select`, `tabs`, `switch`, `tooltip`, `avatar`, `badge`, `input`, `label`, `textarea`, `separator`, `sheet`, `skeleton`, `scroll-area`, `progress`, `navigation-menu`, `table`, `sonner`. Treat these as generated/vendored — prefer regenerating via the `shadcn` CLI over hand-editing when upgrading, unless you're intentionally customizing one.

- **`dialog.tsx`/`alert-dialog.tsx` carry an intentional, non-generated patch**: `DialogContent`/`AlertDialogContent` both supply their own `onOpenAutoFocus`/`onCloseAutoFocus` to fix a real bug — every dialog in this app is opened via a plain `<Button onClick={() => setOpen(true)}>` (controlled `open` state), never an actual `<DialogTrigger>`/`AlertDialogTrigger`. Radix's own default `onCloseAutoFocus` unconditionally calls `event.preventDefault()` before trying `context.triggerRef.current?.focus()` — pre-empting FocusScope's own correct restore-to-previously-focused-element fallback, then failing silently because `triggerRef` is never populated without a real Trigger component. Net effect without the patch: closing *any* dialog drops keyboard focus to `<body>`. Don't regenerate these two files via the `shadcn` CLI without re-applying this fix (or wrapping every call site in a real `DialogTrigger` instead, which would be the "proper" fix but touches ~10 files).

`components/dashboard/*` — cross-cutting chrome: `DashboardShell` (sidebar + header + mobile sheet nav + theme menu, wraps every `(dashboard)` route), `PageHeader`, `EmptyState`.

## 17. Coding Standards

- **TypeScript everywhere**, `strict: true`. No `any` was observed in the files read for this handbook; prefer precise types (see `lib/ai/types.ts`, `components/ai-studio/types.ts`) over widening.
- **Path alias**: `@/*` maps to the repo root (`tsconfig.json`) — always import via `@/components/...`, `@/lib/...`, never relative paths across top-level folders.
- **`"use client"` boundary**: kept as small and as low in the tree as possible — pages default to Server Components; only components that need interactivity, browser APIs, or hooks are marked `"use client"`. Preserve this — don't blanket-convert a page to a client component just to add one interactive widget; extract the widget instead (this is the existing pattern for e.g. `StudioWorkspace`, `ReviewActionBar`, every dialog). `DeveloperDetails` (Section 12) is a good example of the opposite direction done right — it's a Server Component even though it composes several `"use client"` collapsible panels underneath.
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
  - AI endpoints (`/api/generate`) return `{ data }` on success and `{ error, details? }` on failure, with meaningful HTTP status codes (`400`/`502`/`503`/`500`) via `AIServiceError`. `POST /api/creations/[id]/regenerate` follows the CRUD convention instead (`{ success: true, id }`), matching its sibling `/api/creations` routes rather than `/api/generate`.
  - CRUD endpoints (`/api/projects*`) return the resource directly (no `{ data }` wrapper) on success, and `{ error }` on failure, generally with a blanket `500` regardless of the underlying cause (no differentiated status codes for e.g. not-found vs. validation).
  - `/api/creations`, `/api/creations/[id]/regenerate`, and `/api/creations/[id]/status` all return `{ success: true, ... }` shapes.
- **`runtime = "nodejs"`** is declared on every route that calls Gemini (`/api/generate`, `/api/creations` (image generation on save), `/api/creations/[id]/regenerate`) — needed for the Gemini SDK / outbound fetch; follow this for any new route that calls an external SDK expecting the Node runtime.
- **Error handling is inconsistent** — most handlers wrap their body in `try/catch` and log with `console.error(error)` before returning a generic `500`. When adding new routes, default to the `try/catch` + `console.error` + typed error response pattern used by the Projects routes.
- **Params are async**: this Next.js version passes route params as `Promise<{...}>` — always `const { id } = await params` in dynamic route handlers, matching every existing `[id]/route.ts`.
- **No input validation library on CRUD routes today** except `/api/generate`. If a route accepts user-controlled data beyond simple string presence, prefer adding a Zod schema (matching the `lib/ai/schemas.ts` / `lib/brand-kit/schema.ts` style) over ad hoc manual checks.

## 21. Error Handling Standards

- **`AIServiceError`** (`lib/ai/gemini.ts`, duplicated in `lib/ai/openrouter.ts`) is the one structured error type in the codebase: `message`, `status` (HTTP code to surface), optional `cause`. Route handlers check `error instanceof AIServiceError` to decide whether to forward its status/message or fall back to a generic `500`. Use this pattern for any new external-service integration.
- **Everywhere else**, errors are handled ad hoc: `try/catch` + `console.error(error)` + a hardcoded generic message and status. There is no central logger, no error-reporting/monitoring integration (e.g., Sentry) wired in.
- **Client-side**, failures are surfaced via `sonner` toasts in the Projects/Brand Kit/Review page flows (`toast.error(error instanceof Error ? error.message : "...")`).
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
- **`GenerationProgress` cycles friendly copy on a timer, not real progress** (`components/ai-studio/generation-progress.tsx`) — it has no visibility into the resilience pipeline's actual retry/key/model state (Section 14), so it cycles "Generating your content..." → "Retrying..." → "Using backup AI model..." based on elapsed time, not a real signal. Don't rely on it to reason about real latency, and don't build new features assuming Gemini responses stream — they don't; `/api/generate` and `/api/creations/[id]/regenerate` both await the full (potentially multi-stage, potentially retried) response before returning.
- **No caching layer** (no Next.js `fetch` cache tuning, no React Query despite it being installed, no Redis/edge cache) — every page load re-queries Postgres directly. Acceptable at current scale; revisit if traffic grows.
- **Every Server Component page reading live Prisma data must declare `export const dynamic = "force-dynamic"`.** Next.js statically prerenders a page at build time by default when it can't detect a reason not to — a plain `prisma.findMany()` call with no `cookies()`/`headers()`/dynamic `searchParams` usage isn't enough of a signal on its own. `/projects` and `/brand-kit` were missing this (confirmed via `npm run build`'s route table showing them as `○` static instead of `ƒ` dynamic) — in production, that meant new/edited/deleted Projects and Brand Kits silently stopped showing up after the first build, even though every mutation correctly called `router.refresh()`. Both are fixed now. If you add a new page under `(dashboard)` that reads mutable data directly via Prisma, check `npm run build`'s route table for `○` vs `ƒ` before considering it done — dynamic route segments (`[id]`) don't need the explicit marker (they default to on-demand dynamic without `generateStaticParams`), but top-level list pages do.

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
- **Creations**: persisted with full multi-format payload (caption/hashtags/carousel/story/reel), plus Research/Planner/Visual Prompt/Quality Score/generated images, all queried alongside the Creation.
- **Review page** (Section 12): Generated Content / Generated Images / Hashtags / Publishing Preview, a collapsed-by-default Developer Details section for everything else, and a sticky bottom action bar (Approve & Publish / Schedule / Regenerate / Delete). No conversational AI editing anywhere — see the next bullet.
- **Regenerate** (Section 12a): one-click, full-pipeline regeneration of an already-saved creation (caption, hashtags, carousel/story/reel, image prompts, and images), forcing every cache stage fresh.
- **Approve & Publish / Schedule** (Section 12b): a `CreationStatus` scaffold (`DRAFT/APPROVED/SCHEDULED/PUBLISHED`) — **status tracking only, no real social-publishing integration** exists yet.
- **Shell/UX**: collapsible sidebar, mobile nav sheet, light/dark/system theme toggle, toast notifications.

## 27. Planned Features

Per the README's roadmap section (not yet started in code, listed here for context, not as a promise of scope):
Manual Caption Editor, Version History, Content Calendar, Analytics Dashboard, Team Collaboration, Multi-Brand Support. Actual authentication/session management should be added to this list in practice, even though the README frames it as already "completed" — see [Section 8](#8-authentication-flow). Two items the README lists as future work are now partially true and worth calling out explicitly:
- **AI Image Generation** — implemented (Gemini/FLUX providers, Section 12c), auto-triggered on save/regenerate; what's still missing is compositing the Brand Kit's logo/watermark/fonts onto those images (Section 12c).
- **Social Media Publishing / Approval Workflow** — the Review page's Approve & Publish / Schedule buttons and `CreationStatus` field (Section 12b) are a status-tracking scaffold for this, not the real integration.

## 28. Known Technical Debt

- **Dashboard home page is fully mock data.** `app/(dashboard)/page.tsx`'s stats cards and "Recent creations" list are hardcoded arrays, not queried from the database. Anyone asked to "fix the dashboard numbers" should treat this as a build-it task, not a bug fix.
- **`/history` is unimplemented** — it renders only a static `EmptyState`, with no query, no filtering, no data model distinction from "all creations."
- **`/settings` is fully static and non-persisted** — the notification/desktop-experience `Switch`es use `defaultChecked` with no state or backend, and "Profile"/"Appearance" rows are descriptive text only.
- **Brand Kit data does not influence generation.** A Project can reference a Brand Kit, but `buildInstagramContentPrompt` never reads Brand Kit fields (tone, keywords, avoid-words, etc.) — the core "brand-safe content" value proposition (see [Section 2](#2-business-goal)) is not actually wired end-to-end yet.
- **Two parallel, inconsistent "default project color" values** exist across the Prisma schema default (`#3B82F6`), the `/api/projects` POST fallback (`#7C3AED`), and the client-side swatch palettes (`#7C3AED` first of six). Pick one source of truth if this is ever touched.
- **Dead/orphaned code**: `lib/ai/openrouter.ts` (unused alternate provider), `components/creations/{caption-card,carousel-card,story-card,reel-card,creation-header,hashtags-card}.tsx` (unused, superseded by inline rendering in `OutputPanel`), a commented-out duplicate `save()` in `create-brand-dialog.tsx`, and a `test-gemini.js` entry in `tsconfig.json`'s `include` array pointing at a file that no longer exists in the repo.
- **`structure.txt`** (~3MB) is committed to git at the repo root — almost certainly an accidental commit of a generated directory listing; flag before removing (see [Git Workflow](#24-git-workflow)).
- **README drift**: claims Next.js 15 (actual: 16.2.11), claims `react-markdown`/`remark-gfm`-powered AI chat rendering (neither package exists in `package.json`, and the AI Assistant chat panel it's describing has since been removed entirely — see Section 12), and frames Authentication as a completed feature (it does not exist). Treat `README.md` as a product pitch, not a spec — this file (`CLAUDE.md`) is the accurate technical reference.
- **No tests, no CI.** No test runner is installed, no `*.test.*`/`*.spec.*` files exist, and there is no `.github/workflows/`. `npm run lint` and `npm run build` are the only available correctness gates today.
- **Installed-but-unused dependencies**: `zustand`, `@tanstack/react-query` (+ devtools), `react-hook-form` + `@hookform/resolvers`, `framer-motion` — present in `package.json` but not exercised by any file read while building this handbook. If you reach for one of these, you're likely introducing a new pattern to the codebase, not following an existing one — do so deliberately and be ready to justify the choice over the current hand-rolled `useState`/`fetch` approach.
- **Brand Kit visual compositing is unwired** (Section 12c) — the logo/watermark/safe-margin/font renderer (`lib/creative-renderer/`) exists but nothing calls it, and it's built against the browser Canvas API with no Node canvas package installed, so it can't be called from the image generation route as-is. Generated images carry no brand overlay today.
- **`Creation.status`/`scheduledAt` is a scaffold, not a real publishing pipeline** (Section 12b) — "Approve & Publish"/"Schedule" only ever update a database column; nothing posts to any social platform. Don't build a feature that assumes `PUBLISHED` means a post actually went out.

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
7. **Error paths return the established shape for their module** (see [Section 20](#20-api-development-standards)) and are user-visible where the module's convention is to toast (Projects/Brand Kit/Review page) — don't leave a new mutation silently failing to `console.error` only.
8. **No secrets, API keys, or `.env*` contents are committed.**
9. **For UI-facing changes**: the feature has actually been exercised in the running app (`npm run dev`), in both light and dark theme, not just type-checked — this codebase has a history of decorative-only controls (dashboard stats, Edit/Copy buttons on the Creation page, the Settings switches); don't add another one by leaving a control wired to nothing.
10. **The change doesn't quietly expand the blast radius of the "no auth" gap** — e.g., don't add a new mutation endpoint that assumes a `userId` will "just be added later"; build for the current single-tenant reality unless the task is explicitly to begin multi-tenancy.
