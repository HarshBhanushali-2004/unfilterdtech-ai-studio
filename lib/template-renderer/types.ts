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
 *
 * Phase 1C.5 — Reference-Based Visual Quality upgrade: a format no longer
 * resolves to one fixed `FormatLayout`. Each format now exposes a small set
 * of named `FormatLayout` variants ("compositions") — see `CompositionId`
 * below — selected per generated item by `composition-selector.ts`'s
 * deterministic, content-aware heuristic (never per-generation UI, never
 * random). This is purely an additive generalization: the element
 * vocabulary, the renderer, and every existing `TemplateElementType` are
 * unchanged; a format with only one composition would behave exactly as
 * Phase 1C did.
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
   * A legibility gradient (transparent → a dark/light color) drawn as its
   * own rectangle — used by full-bleed compositions so text can sit
   * directly on top of a photo without a boxed background behind it.
   * Purely order-dependent: placed after `mediaFrame` and before whatever
   * text elements sit over the image in a layout's `elements[]` array, the
   * same way every other z-ordering in this renderer already works — no
   * new stacking-context concept, just "draw a translucent rect here."
   */
  | "scrim"

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
  /** "auto" resolves against the template's background darkness; anything else is used as a literal color. Compositions that place text over a `scrim`/full-bleed image must use a literal light color here rather than "auto" — "auto" only reasons about the flat page background, not what's visually behind a photo. */
  color?: "auto" | string
  /** "brand-primary" | "brand-accent" | "auto" resolve against Brand Kit colors; anything else is a literal color or "transparent". */
  background?: "auto" | "brand-primary" | "brand-accent" | "transparent" | string
  borderRadius?: number
  opacity?: number
  /** `mediaFrame` only — draws a stroked border inside the frame's edge, e.g. for a "framed inset photo on a solid background" composition. Omitted/0 draws no border (the original Phase 1C contained-media look, and every full-bleed composition). */
  borderWidth?: number
  /** `mediaFrame` only — border stroke color; a literal color, "brand-accent", or "auto" (resolves to a light/dark neutral based on the page background). Ignored when `borderWidth` is unset. */
  borderColor?: "auto" | "brand-accent" | string
  /**
   * `scrim` only — which edge of the element's own box the gradient fades
   * *toward* (transparent at the opposite edge). "to-bottom" (default) suits
   * a headline anchored at the bottom of an image; "to-top" suits a
   * headline/caption anchored near the top.
   */
  scrimDirection?: "to-top" | "to-bottom"
}

export type FormatLayout = {
  canvas: { width: number; height: number }
  /** This template never overlays text on top of media pixels (the media frame is its own contained element, never full-bleed-under-text) — see `render-frame.ts`'s doc comment for why that keeps contrast handling simple and reliable. */
  background: { type: "solid"; color: "auto" | "brand-primary" | string }
  elements: TemplateElement[]
}

export type ContentFormat = "carousel" | "post" | "story" | "reel"

/**
 * Every internal composition variant a format can render as — a visual
 * arrangement of the same element vocabulary (full-bleed hero image with
 * overlaid headline, headline-led text-first layout, a contained/framed
 * photo, or — carousel only — a big typographic slide-number treatment for
 * rhythm across a multi-slide story). Never user-selectable: chosen
 * automatically per generated item by `composition-selector.ts` based on
 * that item's own content (headline length, body length, media type,
 * position in the sequence). `"numbered-editorial"` is carousel-only —
 * other formats simply don't register it (see `FormatCompositions`).
 */
export const COMPOSITION_IDS = ["hero-full-bleed", "text-first", "framed-editorial", "numbered-editorial"] as const
export type CompositionId = (typeof COMPOSITION_IDS)[number]

/** A format's registered compositions — not every format registers every `CompositionId` (e.g. only `carousel` registers `"numbered-editorial"`), so this is intentionally partial; resolution always falls back safely (see `registry.ts`'s `getComposition`). */
export type FormatCompositions = Partial<Record<CompositionId, FormatLayout>>

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
  formats: Record<ContentFormat, FormatCompositions>
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
