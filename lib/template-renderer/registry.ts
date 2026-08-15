import { EDITORIAL_TECH } from "./families/editorial-tech"
import { MINIMAL_MAGAZINE } from "./families/minimal-magazine"
import type { TemplateFamily } from "./types"

/**
 * Every registered `TemplateFamily`, keyed by id — code-defined, not
 * database-defined (Phase 1C, AGENTS.md Core Requirement #15/#16: "Prefer
 * typed TypeScript schemas... The system should be able to add a new
 * template without rewriting Carousel/Post/Story/Reel renderers"). Mirrors
 * `lib/ai/image-providers/manager.ts`'s `PROVIDER_REGISTRY` pattern exactly
 * — a `BrandKit` only ever stores a template's `id` string
 * (`BrandKit.templateFamilyId`), resolved through this registry at
 * generation/render time, never a copy of the template itself.
 */
const REGISTRY: Record<string, TemplateFamily> = {
  [EDITORIAL_TECH.id]: EDITORIAL_TECH,
  [MINIMAL_MAGAZINE.id]: MINIMAL_MAGAZINE,
}

const DEFAULT_TEMPLATE_ID = EDITORIAL_TECH.id

/** Registers a new template family — the extension point for adding e.g. "Bold News" or "Cinematic Dark" later without touching any renderer. */
export function registerTemplate(template: TemplateFamily): void {
  REGISTRY[template.id] = template
}

export function listTemplates(): TemplateFamily[] {
  return Object.values(REGISTRY)
}

/** Falls back to the default template for an unknown/missing id — e.g. a Brand Kit created before Phase 1C, or a `templateFamilyId` referencing a template that's since been removed. Never throws; template resolution must never block generation. */
export function getTemplate(id: string | null | undefined): TemplateFamily {
  if (id && REGISTRY[id]) return REGISTRY[id]
  return REGISTRY[DEFAULT_TEMPLATE_ID]
}

export function getDefaultTemplate(): TemplateFamily {
  return REGISTRY[DEFAULT_TEMPLATE_ID]
}

export { DEFAULT_TEMPLATE_ID }
