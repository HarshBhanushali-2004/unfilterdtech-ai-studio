import type { RendererFont } from "@/lib/creative-renderer/types"

/**
 * Phase 1C — Unified Content Template System (see AGENTS.md). Generalizes
 * Phase 1B's carousel-only `CarouselTemplateDefinition` into one
 * `TemplateFamily` per brand identity, with a format-specific
 * `FormatLayout` for each of carousel/post/story/reel — "one template-family
 * concept with format-specific render rules," not four unrelated template
 * systems. All four layouts share the exact same element vocabulary
 * (`TemplateElement`) and the exact same renderer (`renderFrame`,
 * `render-frame.ts`); only positions/sizes/canvas dimensions differ per
 * format.
 */

export type TemplateElementType =
  | "category"
  | "headline"
  | "mediaFrame"
  | "body"
  | "progress"
  | "cta"
  | "branding"

/**
 * One positioned, styled element of a `FormatLayout` — the data-driven
 * building block every format's layout is built from. Coordinates/sizes are
 * in canvas pixels for that format's own `canvas` size.
 */
export type TemplateElement = {
  id: string
  type: TemplateElementType
  x: number
  y: number
  width: number
  height: number
  /** Text elements only. Falls back to the Brand Kit's heading/body font by element type when omitted. */
  font?: RendererFont
  fontSize?: number
  fontWeight?: string
  lineHeight?: number
  align?: "left" | "center" | "right"
  maxLines?: number
  /** "auto" resolves against the template's background darkness; anything else is used as a literal color. */
  color?: "auto" | string
  /** "brand-primary" | "brand-accent" | "auto" resolve against Brand Kit colors; anything else is a literal color or "transparent". */
  background?: "auto" | "brand-primary" | "brand-accent" | "transparent" | string
  borderRadius?: number
  opacity?: number
}

export type FormatLayout = {
  canvas: { width: number; height: number }
  /** This template never overlays text on top of media pixels (the media frame is its own contained element, never full-bleed-under-text) — see `render-frame.ts`'s doc comment for why that keeps contrast handling simple and reliable. */
  background: { type: "solid"; color: "auto" | "brand-primary" | string }
  elements: TemplateElement[]
}

export type ContentFormat = "carousel" | "post" | "story" | "reel"

/**
 * One brand identity's complete visual system — the same headline
 * treatment, color language, and spacing logic expressed once per format.
 * Selecting a `TemplateFamily` on a Brand Kit (see
 * `lib/template-renderer/registry.ts`) makes every format for that brand
 * "visually feel like the same brand" (AGENTS.md Core Requirement #3)
 * without duplicating brand configuration per format.
 */
export type TemplateFamily = {
  id: string
  name: string
  description: string
  formats: Record<ContentFormat, FormatLayout>
}

/**
 * The generic content a single rendered frame needs — one carousel slide,
 * the one post, one story frame, or one reel scene's storyboard preview.
 * `progress` is omitted for POST (a single post has no "N of total");
 * every other format supplies it.
 */
export type FrameContent = {
  category: string
  headline: string
  body: string
  cta: string
  /** Pre-formatted so the renderer never needs to know each format's own numbering convention (e.g. "3 / 6" for a carousel slide, "Scene 2 / 5" for a reel). */
  progress?: string
}
