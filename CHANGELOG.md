# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [0.1.0] - Initial MVP

This release covers everything present in the repository through the current working tree — the single-user, end-to-end content-creation loop from Brand Kit definition through AI generation, saving, and AI-assisted rewriting. It corresponds to `package.json` version `0.1.0`.

### Added

- **Brand Kit module** — full create/read/update/delete for reusable brand identities (name, website, industry, description, target audience, language, tone, writing style, emoji style, CTA style, logo URL, primary/secondary/accent colors, keywords, hashtags, avoid-words), implemented via Next.js Server Actions (`lib/brand-kit/actions.ts`) with Zod validation and a list UI with an empty state.
- **Projects module** — full create/read/update/delete for Projects, each optionally associated with a Brand Kit and tagged with a color; project list and detail pages, with per-content-type creation counts on the detail page.
- **AI Studio** — a generation workspace supporting three source types (topic, free text, reference URL), four content formats (Instagram post, carousel, story, reel), a tone selector, and a creativity slider; submits to Gemini and renders a tabbed preview of the result.
- **Gemini AI content generation** — `POST /api/generate`, backed by `lib/ai/gemini.ts`, producing a structured JSON payload (caption, hashtags, carousel slides, story frames, reel script/scenes) validated against a Zod schema before being returned to the client.
- **Creation management** — generated drafts can be saved to a Project (`POST /api/creations`), persisting the full multi-format payload as a `Creation` record, including an in-flow "create a new project" fallback when no project is pre-selected.
- **Creation Details page** — a per-Creation page rendering the saved caption and the original source prompt, and hosting the AI Assistant panel.
- **AI Rewrite Assistant** — an in-page assistant on the Creation Details page offering six quick-action rewrites (Shorter, Funny, Better Hook, Professional, Instagram, LinkedIn) plus free-form instructions, backed by `POST /api/rewrite`.
- **Accept Rewrite functionality** — persists an accepted rewrite back onto the Creation's caption via `PATCH /api/creations/[id]/caption`.
- **Dashboard shell** — collapsible sidebar navigation, mobile navigation sheet, header search field, and workspace entry points across all top-level pages.
- **Theme support** — light/dark/system theming via `next-themes`, toggled from the dashboard header.
- **Toast notifications** — consistent success/error feedback (via `sonner`) across Project and Brand Kit mutation flows.
- **Database schema and migrations** — `BrandKit`, `Project`, and `Creation` Prisma models with a `ContentType` enum, established across two migrations (`20260724142020_init`, `20260726085635_add_brand_kit`).
- **Engineering documentation** — `CLAUDE.md` (technical handbook), `PROJECT_STATUS.md` (living status tracker), and `ARCHITECTURE.md` (long-term architecture reference) established to document the system as built.

### Changed

- **Prisma 7 adopted with a driver adapter** (`@prisma/adapter-pg`) and a `prisma.config.ts` configuration file, rather than the legacy `package.json`-based Prisma configuration — the connection is made directly over `pg` instead of Prisma's historical binary query engine.
- **Two distinct mutation patterns were adopted deliberately, one per module**: Brand Kit is built on Next.js Server Actions with `revalidatePath`, while Projects and Creations are built on REST Route Handlers called via `fetch` with `router.refresh()` to re-sync Server Component data. This split reflects how each module was implemented, not an oversight.
- **Radix UI packages migrated to the official `@radix-ui/react-*` packages** during the dashboard foundation work, replacing an earlier shadcn/ui scaffold based on a different Radix packaging approach.
- **Parent-to-child relations use soft-detach semantics** (`onDelete: SetNull`) for `Project → BrandKit` and `Creation → Project`, so deleting a Brand Kit or Project never cascades into deleting downstream records — a deliberate simplicity choice for this stage of the product.
- **Production build target set to Webpack** (`next build --webpack`) rather than Turbopack.

### Fixed

- **Production build stabilization** — the "complete AI Studio creation management and production build fixes" commit resolved issues preventing a clean production build once the Creation Details page and its supporting components were introduced.
- Beyond this, the repository does not carry a dedicated history of discrete bug-fix commits (no `fix:`-prefixed commits exist in git history); most correctness issues were resolved inline as part of the feature commits that introduced them.

### Technical Improvements

- Established a single Prisma Client singleton (`lib/prisma.ts`) with `globalThis` caching in development to survive Next.js hot-reload.
- Centralized AI provider logic behind a narrow contract in `lib/ai/` (`generateInstagramContent`, `rewriteContent`, a shared `AIServiceError`), including a complete, functionally equivalent OpenRouter-based implementation (`lib/ai/openrouter.ts`) built alongside the active Gemini implementation, demonstrating the layer's provider-agnostic design even though only one provider is wired in.
- Applied Zod schema validation at the AI request/response boundary (`lib/ai/schemas.ts`) and the Brand Kit mutation boundary (`lib/brand-kit/schema.ts`).
- Added database indexes on foreign keys and `createdAt` (`Project.brandKitId`, `Creation.projectId`, `Creation.createdAt`) to support existing sort/filter queries.
- Adopted a consistent `"use client"` boundary discipline — interactive islands (dialogs, the Studio workspace, the AI Assistant panel) are isolated from the Server Components that own initial data fetching.

### Known Limitations

Summarized from `PROJECT_STATUS.md` — see that document for full detail and current priority:

- **No authentication or multi-user support** — there is no `User` model, no session handling, and no per-record ownership; all data is effectively global.
- **Brand Kit data does not influence AI generation** — a Project may reference a Brand Kit, but prompt construction does not yet read any Brand Kit field.
- **Dashboard home page uses hardcoded mock data** rather than live database queries; `/history` and `/settings` are static, non-functional pages.
- **Several UI controls are not yet wired up** — the Creation Details page's Edit and Copy Caption buttons have no handlers, and the Settings page's toggles do not persist.
- **No tests and no CI** — `npm run lint` and `npm run build` are the only correctness gates today.
- **No pagination, caching layer, background job system, or file storage layer** exists yet.
- **A single AI provider is active at a time, selected at the code level** rather than through a runtime-configurable strategy.
- Known housekeeping items: an accidentally-committed `structure.txt` generated file, a few orphaned/unused components and a shelved AI provider module, and minor README drift versus the actual codebase (see `CLAUDE.md` for the full list).

---

## Future Update Rules

Every future release gets its own dated section, appended below this line — **never edit or rewrite a previous release's entry**. If a past decision changes, add a new entry describing the change; the old entry stays as an accurate record of what was true at the time.

Use this template for each new release:

```
## [0.2.0] - YYYY-MM-DD

### Added

### Changed

### Fixed

### Removed

### Performance

### Security

### Documentation
```

Guidelines for filling it in:

- **Only include sections that have real content for that release** — omit empty headings rather than leaving them blank.
- **Write entries against the actual diff/commit history for that release**, not against `PROJECT_STATUS.md`'s roadmap or aspirations — a feature belongs in `CHANGELOG.md` once it has landed, not while it is planned or in progress.
- **Bump the version number according to Semantic Versioning**: patch (`0.1.x`) for fixes/small technical improvements, minor (`0.x.0`) for backward-compatible feature additions, major (`x.0.0`) once the project has a stable public contract worth protecting (this project has not reached that point yet).
- **Keep `[Unreleased]` as the working area** for changes that have merged but not yet been cut into a dated release; move its contents into a new dated section at release time and leave `[Unreleased]` empty again.
- **Cross-check new entries against `PROJECT_STATUS.md` and `ARCHITECTURE.md`** at the time of writing — a change that alters the system's durable architecture should also prompt an `ARCHITECTURE.md` update; a change that closes out a roadmap item should also update `PROJECT_STATUS.md`.
- **Do not invent or backfill history** — if a past change's rationale or exact scope isn't recoverable from git history or the codebase, describe only what can be verified, as this document does for the `[0.1.0]` release above.
