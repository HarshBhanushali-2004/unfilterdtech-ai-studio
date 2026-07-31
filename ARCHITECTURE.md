# ARCHITECTURE.md

> Long-term technical architecture reference for **UnfilterdTech AI Studio**. Unlike `PROJECT_STATUS.md` (which changes after every feature) and `CLAUDE.md` (which is an operational handbook full of file-level detail), this document describes the durable *shape* of the system — the decisions that should outlive any single feature. It should rarely change, and only when an architectural decision actually changes, not when a feature ships.

---

# Project Architecture

## High-Level Architecture Overview

UnfilterdTech AI Studio is a **server-rendered, monolithic Next.js application**. There is no separate backend service, no microservices, and no dedicated API gateway — the Next.js App Router serves both the UI (via Server and Client Components) and the API surface (via Route Handlers) from a single deployable unit, backed by a single PostgreSQL database.

```
                         ┌─────────────────────────────────────────┐
                         │              Browser (Client)            │
                         │   React Client Components ("use client") │
                         └───────────────┬───────────────────────────┘
                                         │
                     HTTP (fetch) │      │ Server Action calls
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                              Next.js Application (single deployable)              │
│                                                                                     │
│   ┌────────────────────────┐     ┌────────────────────────┐                       │
│   │   Server Components      │     │   API Route Handlers    │                    │
│   │  (pages under app/)      │     │      (app/api/**)        │                    │
│   │  — direct Prisma reads   │     │  — Projects, Creations,  │                    │
│   │                          │     │    Brand Kit list, AI    │                    │
│   └────────────┬─────────────┘     └────────────┬─────────────┘                   │
│                │                                  │                                 │
│   ┌────────────▼─────────────┐                    │                                │
│   │   Server Actions          │                    │                                │
│   │  (lib/brand-kit/actions)  │                    │                                │
│   └────────────┬─────────────┘                    │                                │
│                │                                  │                                 │
│                └───────────────┬──────────────────┘                                 │
│                                │                                                     │
│                    ┌───────────▼────────────┐        ┌──────────────────────────┐   │
│                    │   Prisma ORM Client      │        │   AI Layer (lib/ai)       │  │
│                    │   (lib/prisma.ts)        │        │   Gemini SDK integration  │  │
│                    └───────────┬──────────────┘        └────────────┬─────────────┘  │
└────────────────────────────────┼──────────────────────────────────────┼──────────────┘
                                 │                                       │
                     ┌───────────▼───────────┐               ┌───────────▼────────────┐
                     │  PostgreSQL (Supabase)  │               │  Google Gemini API      │
                     └─────────────────────────┘               └─────────────────────────┘
```

## Core Design Philosophy

1. **The framework is the architecture.** There is no hand-rolled service layer between the UI and the database — Next.js's own primitives (Server Components, Server Actions, Route Handlers) *are* the application's layers. Business logic lives in small, focused modules under `lib/`, imported directly by whichever layer needs it.
2. **Server-first rendering.** Data that a page needs on first paint is fetched in a Server Component, directly through Prisma, not through a client-side round trip to the app's own API. Client Components exist only where interactivity genuinely requires them.
3. **One record, one shape.** A `Creation` stores its entire generated payload (caption, hashtags, carousel, story, reel) in a single row, regardless of which single format the user actually requested. The system favors a simple, uniform record shape over per-format normalization.
4. **AI as a swappable, isolated concern.** All model-provider logic is confined to `lib/ai/`, behind a narrow contract (`generateInstagramContent`, `rewriteContent`, a shared `AIServiceError`). Nothing outside that folder talks to Gemini directly.
5. **Validate at the boundary, trust internally.** Zod schemas guard the AI request/response boundary (`lib/ai/schemas.ts`) and the Brand Kit mutation boundary (`lib/brand-kit/schema.ts`). Once data has crossed that boundary, downstream code treats it as trusted.

## Architectural Principles

- **Single source of truth per resource type.** Projects and Creations are owned by REST Route Handlers; Brand Kit is owned by Server Actions. A resource's mutation path does not change depending on which UI surface calls it.
- **Server Components own reads for page load; Route Handlers/Server Actions own writes.** This keeps the "what does the user see first" path and the "what happens when the user acts" path architecturally distinct and independently reasoned about.
- **The database is the only durable state.** There is no cache layer, no in-memory session store, and no queue. Every piece of state that must survive a page reload lives in PostgreSQL.
- **Structured errors travel with status codes.** The `AIServiceError` pattern (message + HTTP status + cause) is the model for how any future external-service integration should surface failures to the API layer.
- **The AI layer never persists.** Generation and rewrite functions return data; they do not write to the database. Persistence is always initiated explicitly by a Route Handler (`/api/creations`, `/api/creations/[id]/caption`) at the user's request (Save, Accept Rewrite).

---

# Tech Stack

| Concern | Choice | Role in the architecture |
|---|---|---|
| **Framework** | Next.js (App Router) | Unifies routing, server rendering, and API surface in one application. Route Handlers under `app/api/**` are the REST layer; Server Actions are the RPC-style alternative used by one module (Brand Kit). |
| **UI** | React (Server + Client Components), shadcn/ui, Tailwind CSS | React Server Components render data-driven pages without shipping JS for static structure; Client Components are the interactive islands (forms, dialogs, the Studio workspace, the rewrite panel). shadcn/ui supplies accessible Radix-based primitives; Tailwind supplies the styling system via CSS-first (`@theme`) configuration. |
| **Database** | PostgreSQL (Supabase-hosted) | The single system of record. All application state — Brand Kits, Projects, Creations — lives here. No other datastore exists. |
| **ORM** | Prisma ORM, `@prisma/adapter-pg` driver adapter | Schema-first modeling (`prisma/schema.prisma`), typed query client, migration history as the schema's audit trail. The driver adapter connects Prisma directly to `pg` rather than through Prisma's historical binary-engine transport. |
| **AI** | Google Gemini (`@google/generative-ai`) | The content-generation and rewrite engine. Isolated behind `lib/ai/`'s provider contract, so a different model provider could be substituted without touching callers (see [AI Provider Abstraction](#ai-provider-abstraction)). |
| **Styling** | Tailwind CSS v4, `tw-animate-css`, CSS variables (OKLCH color tokens) | Design tokens (colors, radii) are declared once in `app/globals.css` and consumed by both custom components and shadcn/ui primitives — no per-component color literals for themeable surfaces. |
| **Deployment** | Not yet formalized in-repo (no CI/CD config, no Dockerfile, no platform-specific config beyond `next.config.ts`'s dev-origin allowlist) | The application currently builds as a standard Next.js app (`next build --webpack`) and is deployable to any Next.js-compatible host; a formal deployment pipeline is future work, not a current architectural decision. |

---

# Directory Structure

```
app/
├── (dashboard)/        Route group for all authenticated-workspace pages.
│                       Shares one layout (DashboardShell). No URL segment of
│                       its own — grouping is purely organizational.
├── api/                The application's REST surface. One subfolder per
│                       resource; dynamic segments ([id]) for item-level
│                       operations. This is where Route Handlers live —
│                       the only server-side entry point for Projects,
│                       Creations, and AI generation/rewrite.
└── globals.css          The single source of design tokens (color, radius)
                        consumed across the whole UI via Tailwind v4's
                        CSS-first theme configuration.

components/
├── ai-studio/          Everything the AI Studio workspace needs: source
│                       input, format selection, generation settings, the
│                       generated-output viewer, and progress feedback.
├── brand-kit/          Brand Kit list, cards, and create/edit dialogs.
│                       This is the one feature area whose components call
│                       Server Actions directly rather than fetching a
│                       Route Handler.
├── creations/          Components scoped to a single saved Creation,
│                       principally the AI Assistant rewrite panel.
├── dashboard/          Cross-cutting chrome shared by every dashboard
│                       page: the shell (sidebar/header/nav), page headers,
│                       and empty-state presentation.
├── projects/           Project cards, create/edit/select dialogs, and
│                       row-level actions — the REST-driven counterpart to
│                       components/brand-kit.
├── ui/                  Generated shadcn/ui primitives. Treated as
│                       vendored building blocks, not hand-authored
│                       application code.
└── theme-provider.tsx    Wraps the app in next-themes for light/dark/
                        system theming.

lib/
├── ai/                  The AI provider boundary. Holds the active Gemini
│                       implementation, prompt construction, shared
│                       input/output types, and Zod validation schemas.
│                       Everything that talks to a language model lives
│                       here and nowhere else.
├── brand-kit/           The Brand Kit domain module: Server Actions
│                       (mutations + reads), Zod validation schema, and
│                       DTO/serialization helpers.
├── prisma.ts             The single Prisma Client instance for the whole
│                       application. Every database access — Server
│                       Component, Route Handler, or Server Action — goes
│                       through this file.
└── utils.ts              Small framework-agnostic helpers (currently:
                        Tailwind class merging).

prisma/
├── schema.prisma         The canonical data model definition — the source
│                       of truth for every table, column, relation, and
│                       enum in the system.
└── migrations/            The append-only history of how the schema
                        arrived at its current shape.

prisma.config.ts          Declares where Prisma finds the schema and
                        migrations and which connection string to use —
                        the Prisma 7 configuration entry point.
```

---

# Application Flow

The primary end-to-end user journey the architecture is built around:

```
 User
   │
   ▼
 Dashboard  ───────────────────────────────────────────────────────
   │            (workspace shell: navigation, theme, entry points)
   ▼
 Brand Kit  ────────────────────────────────────────────────────────
   │            Define a reusable identity: name, voice, tone,
   │            colors, keywords, hashtags, avoid-words.
   │            (Server Action-backed CRUD)
   ▼
 Projects  ─────────────────────────────────────────────────────────
   │            Create a Project; optionally attach a Brand Kit.
   │            A Project is the container every Creation belongs to.
   │            (REST Route Handler-backed CRUD)
   ▼
 AI Studio  ────────────────────────────────────────────────────────
   │            Choose a source (topic / text / url), a content
   │            format (post / carousel / story / reel), tone, and
   │            creativity. Submit for generation.
   ▼
 Gemini  ───────────────────────────────────────────────────────────
   │            The Studio's request reaches lib/ai/gemini.ts via
   │            POST /api/generate. A single structured-JSON prompt
   │            is built and sent to the Gemini API; the response is
   │            parsed and Zod-validated before returning to the UI.
   ▼
 Save Creation  ─────────────────────────────────────────────────────
   │            The user reviews the generated draft in the Studio's
   │            output panel and saves it (choosing/creating a
   │            Project if one wasn't pre-selected). This persists a
   │            Creation row via POST /api/creations and navigates to
   │            its detail page.
   ▼
 AI Rewrite  ────────────────────────────────────────────────────────
   │            On the Creation detail page, the AI Assistant panel
   │            sends the saved caption plus an instruction (a quick
   │            action or free text) to POST /api/rewrite, which
   │            calls lib/ai/gemini.ts's rewriteContent and returns a
   │            single rewritten draft.
   ▼
 Accept Rewrite  ─────────────────────────────────────────────────────
                Accepting the rewrite PATCHes
                /api/creations/[id]/caption, persisting the new text
                as the Creation's caption, and the page reloads to
                reflect the update.
```

Two properties of this flow are architecturally significant:

- **Every step after "Brand Kit" is currently independent of it.** The flow diagram above matches the *intended* product narrative, but the Brand Kit's data does not yet flow into the Gemini prompt at the "Gemini" step — see [Current Constraints](#current-constraints).
- **The rewrite loop is stateless per request.** Each pass through "AI Rewrite" re-sends the *original* saved caption, not the previous rewrite — there is no accumulating conversation state between requests.

---

# Database Architecture

## Entity Relationships

```
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   BrandKit    │ 1     * │    Project    │ 1     * │   Creation    │
│               │◄────────┤               │◄────────┤               │
│ id (cuid)     │         │ id (cuid)     │         │ id (cuid)     │
│ name          │         │ name          │         │ projectId? FK │
│ tone/voice...  │         │ brandKitId? FK │         │ contentType   │
│ keywords[]     │         │ color          │         │ caption        │
│ hashtags[]     │         │               │         │ hashtags Json  │
│ avoidWords[]   │         │               │         │ carousel Json  │
│               │         │               │         │ story Json     │
│               │         │               │         │ reel Json      │
└───────────────┘         └───────────────┘         └───────────────┘
   onDelete: SetNull ────────►   onDelete: SetNull ────────►
```

- A `BrandKit` may have zero or many `Project`s attached; deleting a `BrandKit` detaches (does not delete) its Projects.
- A `Project` may have zero or many `Creation`s; deleting a `Project` detaches (does not delete) its Creations.
- A `Creation` optionally belongs to one `Project` and, transitively, one `BrandKit`. There is no direct `Creation ↔ BrandKit` relation — a Creation only reaches Brand Kit data by way of its Project.

## Data Flow

```
BrandKit ──(optional attach)──► Project ──(required attach)──► Creation
                                                                    │
                                                        generated payload
                                                        (caption, hashtags,
                                                         carousel, story, reel)
                                                        persisted as one row
```

Data flows **downward and forward only** — a `Creation` is a snapshot taken at save time. There is no back-propagation: editing a `BrandKit` or `Project` after a `Creation` exists does not retroactively change that Creation's stored content.

## Prisma Models

- **`BrandKit`** — the brand-identity record: naming/voice fields (`tone`, `writingStyle`, `emojiStyle`, `ctaStyle`, `targetAudience`, `language`), visual fields (`primaryColor`/`secondaryColor`/`accentColor`, `logoUrl`), and guidance arrays (`keywords`, `hashtags`, `avoidWords`) stored as native Postgres text arrays.
- **`Project`** — the organizational container: `name`, `description`, `color`, an optional `brandKitId`, and the inverse `creations` relation.
- **`Creation`** — the generated-content record: an optional `projectId`, the `contentType` enum, generation parameters (`tone`, `creativity`), the editable `caption`, and three `Json` columns (`carousel`, `story`, `reel`) plus a `Json` `hashtags` column holding the non-caption parts of the generated payload. `model` records which AI backend produced it (currently always `"Gemini"`, client-supplied).
- **`ContentType` (enum)** — `POST | CAROUSEL | STORY | REEL`. The one enum in the schema; every other categorical field (`tone`, brand voice descriptors) is intentionally free-text rather than enumerated, to stay flexible for AI prompt input.

## Current Limitations

- **No `User`/tenant model.** Every table is global — there is no ownership column anywhere in the schema. This is the single largest structural gap for any multi-user future.
- **No cascading integrity beyond `SetNull`.** The schema has no `Cascade`/`Restrict` relations; every relationship degrades gracefully to "detached" rather than enforcing stricter lifecycle rules. This is a deliberate simplicity choice today, not an oversight, but it should be revisited if referential guarantees become a product requirement (e.g., "a Creation must always belong to a Project").
- **JSON columns are structurally unvalidated at the database layer.** `hashtags`/`carousel`/`story`/`reel` are opaque `Json` — Prisma enforces no shape on them. The only structural guarantee comes from Zod validation at generation time (`lib/ai/schemas.ts`), and that guarantee does not re-run at save time.
- **No pagination-oriented indexing strategy beyond simple sort columns.** Indexes exist for foreign keys and `createdAt`, which is sufficient for `ORDER BY` today but does not yet include the composite/cursor-friendly indexes a paginated API would want at scale.

---

# API Architecture

All endpoints are Next.js Route Handlers (`app/api/**/route.ts`). There is no GraphQL layer and no RPC framework — request/response bodies are plain JSON.

### `POST /api/generate`
- **Purpose**: Generate a new piece of AI content (caption + hashtags + carousel + story + reel) from a source input.
- **Method**: `POST`
- **Request**: `{ sourceType: "topic"|"text"|"url", input: string, contentTypes: string[], tone: string, creativity: number }`
- **Response**: `200 { data: GeneratedInstagramContent }` on success.
- **Validation**: Full Zod validation on both the request (`generateContentInputSchema`) and the Gemini response (`generatedInstagramContentSchema`) before it is returned to the client.
- **Error handling**: `400` invalid JSON or failed input validation (with `details`); `502` Gemini call failed, returned unparsable JSON, or returned a JSON shape that fails schema validation; `503` AI service not configured (missing API key); `500` unexpected fallback.

### `POST /api/rewrite`
- **Purpose**: Rewrite an existing piece of content according to a natural-language instruction.
- **Method**: `POST`
- **Request**: `{ content: string, instruction: string }`
- **Response**: `200 { data: string }` — the rewritten text.
- **Validation**: Presence-only (both fields required); no schema validation of the response, since the output is unstructured text by design.
- **Error handling**: `400` missing fields or invalid JSON; `502`/`503`/`500` mirrored from the underlying `AIServiceError`.

### `GET /api/projects`
- **Purpose**: List all Projects.
- **Method**: `GET`
- **Request**: none.
- **Response**: `200 Project[]`, ordered by `createdAt desc`.
- **Validation**: none (no input).
- **Error handling**: `500` on any Prisma failure.

### `POST /api/projects`
- **Purpose**: Create a new Project.
- **Method**: `POST`
- **Request**: `{ name: string, description?: string, color?: string, brandKitId?: string }`
- **Response**: `201 Project`.
- **Validation**: Manual presence check on `name` (trimmed, non-empty) only; no Zod schema on this route.
- **Error handling**: `400` missing name; `500` on any other failure.

### `GET /api/projects/[id]`
- **Purpose**: Fetch a single Project by id.
- **Method**: `GET`
- **Request**: `id` path param.
- **Response**: `200 Project`.
- **Validation**: none beyond the id being a valid Prisma lookup key.
- **Error handling**: `404` if not found; `500` on unexpected failure.

### `PATCH /api/projects/[id]`
- **Purpose**: Update a Project's editable fields.
- **Method**: `PATCH`
- **Request**: `{ name, description, color, brandKitId? }` (whole-object replacement style; no partial-field schema).
- **Response**: `200 Project`.
- **Validation**: none — fields are passed to `prisma.update` as given.
- **Error handling**: `500` on failure; no distinct not-found handling.

### `DELETE /api/projects/[id]`
- **Purpose**: Delete a Project.
- **Method**: `DELETE`
- **Request**: `id` path param.
- **Response**: `200 { success: true }`.
- **Validation**: none.
- **Error handling**: `500` on failure. Its Creations are detached (`projectId` set to `null`), not deleted, per the schema's `onDelete: SetNull`.

### `POST /api/creations`
- **Purpose**: Persist a generated draft as a saved Creation.
- **Method**: `POST`
- **Request**: `{ projectId?, title, prompt, contentType, tone?, creativity?, caption, hashtags?, carousel?, story?, reel?, model? }`
- **Response**: `200 { success: true, id }`.
- **Validation**: none via Zod; `contentType` is mapped from a lowercase UI string to the Prisma enum via a local lookup table, with no explicit handling for an unrecognized value.
- **Error handling**: `500` with a logged error on any failure (including a bad `contentType` mapping).

### `PATCH /api/creations/[id]/caption`
- **Purpose**: Overwrite a Creation's caption — the persistence step of "Accept Rewrite."
- **Method**: `PATCH`
- **Request**: `{ caption: string }`
- **Response**: `200 { success: true, caption }`.
- **Validation**: none.
- **Error handling**: **None** — this is the one Route Handler with no `try/catch`; a nonexistent `id` propagates as an unhandled server error rather than a structured response.

### `GET /api/brand-kit`
- **Purpose**: Supply a lightweight `{id, name}` list for Brand Kit `<select>` pickers elsewhere in the UI (not full Brand Kit CRUD).
- **Method**: `GET`
- **Request**: none.
- **Response**: `200 { id: string, name: string }[]`, ordered by `name asc`.
- **Validation**: none (no input; output is a `select`-projected Prisma query).
- **Error handling**: `500` on failure.

**Brand Kit CRUD is intentionally not part of this API surface.** Its create/read/update/delete operations are Next.js Server Actions (`lib/brand-kit/actions.ts`), invoked directly from Client Components rather than over HTTP — see [UI Architecture](#ui-architecture) and [Data Flow](#data-flow).

---

# AI Architecture

## Generation Flow

```
StudioWorkspace (client)
   │  POST /api/generate { sourceType, input, contentTypes, tone, creativity }
   ▼
Route Handler (app/api/generate/route.ts)
   │  1. Parse JSON body
   │  2. Validate against generateContentInputSchema (Zod)
   ▼
buildInstagramContentPrompt()  (lib/ai/prompt-builder.ts)
   │  Builds a single natural-language prompt instructing the model to
   │  return one JSON object covering all four content formats.
   ▼
generateInstagramContent()  (lib/ai/gemini.ts)
   │  Calls the Gemini API with JSON response mode, parses the result,
   │  strips any markdown code fence, and validates the parsed object
   │  against generatedInstagramContentSchema (Zod).
   ▼
Route Handler returns { data: GeneratedInstagramContent }
   ▼
StudioWorkspace renders the result in OutputPanel
```

## Rewrite Flow

```
AIEditorPanel (client, on the Creation detail page)
   │  POST /api/rewrite { content: <current saved caption>, instruction }
   ▼
Route Handler (app/api/rewrite/route.ts)
   │  Presence-check content/instruction (no Zod schema)
   ▼
rewriteContent()  (lib/ai/gemini.ts)
   │  Sends a plain-text instruction+content prompt to Gemini, requesting
   │  plain text back with no markdown/explanation. No output validation.
   ▼
Route Handler returns { data: <rewritten text> }
   ▼
AIEditorPanel displays the result; "Accept Rewrite" persists it via
PATCH /api/creations/[id]/caption
```

## Prompt Construction

Prompt construction is centralized in `lib/ai/prompt-builder.ts` (generation) and inlined directly in `lib/ai/gemini.ts` (rewrite):

- **Generation prompts** are template strings that embed the source material, requested formats, tone, and creativity level, and explicitly specify the exact JSON shape the model must return — including every format (caption, hashtags, carousel, story, reel), regardless of which single format the user actually selected in the UI.
- **Rewrite prompts** are simpler: an instruction plus the original content, with an explicit directive to return only the rewritten text with no markdown or commentary.
- **Brand Kit data is not currently part of prompt construction.** Neither prompt-building path reads a Project's associated Brand Kit — tone/voice/keyword guidance from the Brand Kit does not influence generation today (see [Current Constraints](#current-constraints)).

## Gemini Integration

- A single client library, `@google/generative-ai`, is the sole integration point, wrapped by two functions in `lib/ai/gemini.ts`: `generateInstagramContent` (structured JSON mode) and `rewriteContent` (free-text mode).
- Configuration (`GEMINI_API_KEY`, `GEMINI_MODEL`) is read from environment variables at call time, so credentials/model selection can change without a code deployment.
- A parallel, functionally equivalent integration against OpenRouter exists (`lib/ai/openrouter.ts`) but is not wired into the application's public `lib/ai` export — it represents a deliberately shelved alternative provider, illustrating that the architecture already supports more than one backend implementation behind the same function contract.

## Validation

- **Generation**: validated on both ends — the request against `generateContentInputSchema`, the response against `generatedInstagramContentSchema`. This is the strictest boundary in the system.
- **Rewrite**: validated only on the request side (presence of two string fields). The response is free text by design and has no schema to validate against.
- **Persistence**: `POST /api/creations` does not re-validate the generated payload before writing it to the database — the Zod check at generation time is the only structural guarantee the stored `Json` columns ever receive.

## Current Limitations

- No streaming — the UI waits for a full response on every generation/rewrite call.
- No conversation memory — each rewrite call is stateless and independent; there is no server-side or client-side history of prior turns.
- No provider abstraction layer exposed to callers — `lib/ai/index.ts` hardcodes which implementation (Gemini) is active; switching providers today means changing the barrel export, not selecting a runtime-configurable strategy.
- No cost/rate control — nothing in the architecture limits how often a client can call the AI endpoints.
- No brand-context injection — see Prompt Construction, above.

---

# UI Architecture

## App Router Layout

The `(dashboard)` route group wraps every workspace page in a single `DashboardShell` layout (sidebar navigation, header, theme toggle) without introducing its own URL segment. Each page under it — `/`, `/studio`, `/projects`, `/projects/[id]`, `/creations/[id]`, `/brand-kit`, `/history`, `/settings` — is otherwise independent, with no shared data-fetching layer beyond the shell itself.

## Server Components

Pages default to Server Components and fetch their own data directly via the Prisma client at render time (`/projects`, `/projects/[id]`, `/creations/[id]`, `/brand-kit`). This is the architecture's preferred pattern for anything the user needs to see on first load: it avoids an extra network hop through the app's own API and lets the page be fully rendered before any client JavaScript runs.

## Client Components

Interactivity is isolated into `"use client"` components nested inside Server-Component pages: the Studio workspace, all create/edit/select dialogs, the AI Assistant rewrite panel, and the dashboard shell's navigation/theme controls. The boundary is drawn as low in the tree as practical — a page is not converted to a Client Component just because one of its children needs interactivity.

## Shared UI

Two shared layers exist above feature-specific components:

- **`components/ui/*`** — generated shadcn/ui primitives (buttons, dialogs, selects, cards, etc.), used uniformly across every feature area.
- **`components/dashboard/*`** — cross-cutting chrome (`DashboardShell`, `PageHeader`, `EmptyState`) that every top-level page composes with, giving the app a consistent header/empty-state vocabulary without each page reinventing it.

## State Management

State is local and component-scoped (`useState`/`useTransition`), not global. There is no store (Redux/Zustand-in-practice, Context-based global state) coordinating cross-component data today. Server-owned data is kept fresh after a mutation via `router.refresh()` (Route Handler-backed flows) or `revalidatePath()` (Server Action-backed flows) — the client re-derives its view from the server rather than maintaining a separate client-side cache of server state.

---

# Data Flow

```
 Database (PostgreSQL)
   │
   │  Prisma Client (lib/prisma.ts) — the single access point
   ▼
 ┌───────────────────────────────┬───────────────────────────────┐
 │   Server Actions                │   Route Handlers                │
 │   (lib/brand-kit/actions.ts)     │   (app/api/**/route.ts)          │
 │   — Brand Kit reads + writes     │   — Projects & Creations reads   │
 │                                  │     and writes, AI generation/   │
 │                                  │     rewrite                      │
 └───────────────┬───────────────┴───────────────┬───────────────┘
                 │                                 │
                 ▼                                 ▼
        Server Components                  Client Components
        (initial page data,                (fetch() calls for
         e.g. project lists,                 mutations, and for
         creation detail)                    reading data the
                 │                            initial page didn't
                 │                            already have, e.g.
                 │                            GET /api/projects/:id)
                 └───────────────┬─────────────────┘
                                 ▼
                              User
                    (sees rendered data; triggers
                    the next mutation, restarting
                    the cycle)
```

Two return paths exist from a mutation back to fresh data, and they are **not interchangeable**:

- Route Handler mutations (Projects, Creations) → client calls `router.refresh()` → the owning Server Component re-runs its Prisma query.
- Server Action mutations (Brand Kit) → the action itself calls `revalidatePath()` → Next.js invalidates and re-renders the affected Server Component on next navigation/refresh.

---

# Current Constraints

- **No authentication or tenancy.** Every page and endpoint is unauthenticated and unscoped; all data is effectively global to whoever can reach the deployment.
- **Brand Kit is disconnected from generation.** The data model and UI support attaching a Brand Kit to a Project, but no prompt-construction code reads Brand Kit fields — the "brand-safe content" premise is architecturally supported but not yet implemented end-to-end.
- **Single AI provider active at a time, selected at the code level.** `lib/ai/index.ts` exports one hardcoded implementation; there is no runtime provider-selection strategy.
- **No background job infrastructure.** All work (including AI calls) happens synchronously within a single request/response cycle; there is no queue, worker, or scheduled-job system.
- **No file storage layer.** Brand Kit logo and Creation media are referenced only as URLs (`logoUrl`, visual "suggestions" as text) — there is no upload pipeline or object storage integration.
- **No caching layer.** Every read is a live database query; there is no shared cache (Redis, edge cache, or otherwise) and no client-side query cache in active use.
- **No automated testing or CI gate.** Architectural regressions are currently caught only by manual review, `npm run lint`, and `npm run build`.

---

# Future Architecture

The following describes the direction the architecture should grow in, not a committed timeline. Each item should be scoped as its own deliberate architectural change, not folded silently into an unrelated feature.

### Authentication
Introduce a `User` (and likely `Session`) model, an auth middleware/guard layer (e.g., `middleware.ts` or per-route checks), and a session-aware Prisma client wrapper. Every existing Route Handler, Server Action, and Server Component data-fetch will need an ownership/authorization check added — this is a cross-cutting change, not a single module.

### Multi-User Support
Add an owner-scoping column (`userId`) to `BrandKit`, `Project`, and `Creation`, and thread the authenticated user's id through every query (`where: { userId }`). This depends on Authentication landing first and should be designed together with it, since retrofitting scoping after the fact means auditing every existing query.

### Multi-Brand Support
The schema already supports many Brand Kits and many Projects; multi-brand support mainly requires UI/workflow changes (e.g., a "default brand kit" concept, brand-switching affordances) plus finishing the currently-missing Brand Kit → generation prompt wiring, rather than a new data model.

### Team Collaboration
Requires a `Team`/`Workspace` concept sitting above individual `User`s, with `Project`/`BrandKit` ownership moving from a user to a team, plus a membership/role model. This is a natural extension of the Multi-User work above, not a separate foundation.

### AI Provider Abstraction
Formalize the already-implicit contract in `lib/ai/` (`generateInstagramContent`, `rewriteContent`, `AIServiceError`) into an explicit interface with a provider registry, so `lib/ai/index.ts` can select an implementation (Gemini, OpenRouter, or future providers) based on configuration rather than a hardcoded export. The existing parallel OpenRouter implementation is a proof that the contract is already provider-agnostic in practice — the remaining work is making the selection mechanism explicit and runtime-configurable.

### Background Jobs
Introduce a job queue (e.g., a managed queue service or a lightweight in-process scheduler backed by the database) for any AI work that should not block a request/response cycle — for example, batch generation across multiple formats at once, or future features like scheduled publishing. This is currently unnecessary because all AI calls are single-shot and fast enough to await synchronously, but will become necessary as generation scope grows (e.g., simultaneous multi-format generation, image generation).

### File Storage
Add an object storage integration (e.g., Supabase Storage, S3-compatible storage) for Brand Kit logos and any future generated media (e.g., AI-generated images), with the database storing only the resulting URL/reference — consistent with how `logoUrl` already works today.

### Analytics
Introduce an analytics/event pipeline (e.g., event logging table or a dedicated analytics service integration) once there is real usage data to aggregate. This should read from the existing models (creation counts, generation frequency) rather than requiring new write paths in the core application flow.

---

# Engineering Principles

- **Respect the module boundary of `lib/ai/`.** All model-provider logic — prompt construction, API calls, response parsing, provider-specific error handling — stays inside `lib/ai/`. No component or Route Handler outside it should import a provider SDK directly.
- **Keep the resource-to-mutation-pattern mapping explicit.** A resource is either REST-Route-Handler-owned or Server-Action-owned; when adding a new resource, choose one pattern deliberately and document the choice rather than mixing both for the same resource.
- **Validate at every external or AI-facing boundary.** Any code that accepts data from a client request or returns data from an LLM should have an explicit Zod schema, following the precedent set by `lib/ai/schemas.ts` and `lib/brand-kit/schema.ts` — even where the current codebase hasn't applied this consistently yet (e.g., the Projects/Creations routes), new work should not perpetuate the gap.
- **Prefer Server Components for data that must exist at first paint.** Client-side fetches are for interactions that happen after the page has already loaded, not for the page's primary content.
- **Treat Prisma's schema and migrations as the single source of truth for data shape.** Application code should never assume a shape the schema doesn't declare; new fields go through a migration, not an ad hoc `Json` blob, unless the data is genuinely unstructured (as `Creation`'s AI-generated payload intentionally is).
- **Design every new relation's delete semantics on purpose.** Default to the existing "soft-detach" (`onDelete: SetNull`) convention unless a feature has an explicit reason to cascade or restrict.
- **Isolate provider-specific and infrastructure-specific code behind narrow contracts.** The `AIServiceError` pattern — and the existence of two interchangeable AI provider implementations behind one function signature — is the model to follow for any future external dependency (storage, email, payments, analytics).
- **Prefer additive schema and API evolution.** Extend models and endpoints with new optional fields/parameters rather than changing existing ones' meaning, so that this document's description of the architecture stays accurate for as long as possible.
