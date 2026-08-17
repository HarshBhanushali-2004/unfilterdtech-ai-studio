import type { CompositionId, ContentFormat } from "./types"

export const DEFAULT_COMPOSITION_ID: CompositionId = "framed-editorial"

export type SelectCompositionInput = {
  format: ContentFormat
  headline: string
  body: string
  mediaType: "IMAGE" | "VIDEO" | "NO_MEDIA"
  /** 1-based position within the item's sequence — the one slide for a Post (always 1), a slide/frame/scene order for Carousel/Story/Reel. */
  order: number
  /** Total items in the sequence — 1 for Post. */
  total: number
}

const SHORT_HEADLINE_WORDS = 8
const SUBSTANTIAL_BODY_CHARS = 90

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Picks which `FormatLayout` variant (see `CompositionId`, `types.ts`)
 * renders a given item — Phase 1C.5's "lightweight composition-selection
 * layer." Deterministic and purely a function of that item's own already-
 * generated content: no randomness, no extra AI call, no new Zod/DB schema
 * field. The same plan content always selects the same composition, so a
 * regenerate-without-content-change never visually "flickers" between
 * layouts.
 *
 * This intentionally lives in code (not as an AI-authored field on the
 * planner schemas) — composition is a rendering decision, not a content
 * decision, and keeping it out of the LLM's output surface means it can't
 * fail schema validation, doesn't lengthen already-slow planner prompts,
 * and stays trivially tunable (adjust a threshold here) without touching
 * any prompt-builder or risking a cache-key change on the AI plan cache.
 *
 * Heuristics mirror AGENTS.md's own worked examples: a short, punchy
 * headline with real media reads as a strong visual story (Hero Editorial);
 * a longer explainer-shaped body reads as text-led (Text First / Data
 * Explainer); a designed NO_MEDIA item has nothing to feature full-bleed,
 * so it's always text-led; and a Carousel's opening/closing slides are
 * biased toward the more dramatic full-bleed treatment to bookend the
 * story, matching AGENTS.md's "Slide 1 → Hero Editorial ... final slide →
 * Editorial Conclusion" guidance.
 */
export function selectComposition(input: SelectCompositionInput): CompositionId {
  const { format, headline, body, mediaType, order, total } = input

  const headlineWords = wordCount(headline)
  const hasSubstantialBody = body.trim().length >= SUBSTANTIAL_BODY_CHARS
  const isShortHeadline = headlineWords > 0 && headlineWords <= SHORT_HEADLINE_WORDS
  const isBookendSlide = total > 1 && (order === 1 || order === total)

  // Nothing to feature full-bleed — always lead with typography.
  if (mediaType === "NO_MEDIA") {
    return "text-first"
  }

  if (format === "post") {
    if (hasSubstantialBody && !isShortHeadline) return "text-first"
    if (isShortHeadline) return "hero-full-bleed"
    return "framed-editorial"
  }

  if (format === "carousel") {
    if (isBookendSlide) return isShortHeadline ? "hero-full-bleed" : "text-first"
    if (hasSubstantialBody) return "framed-editorial"
    // Alternate the two lighter-body compositions by position for visual
    // rhythm across the middle of the story — deterministic (a function of
    // `order`, not `Math.random()`), never two "numbered-editorial" slides
    // in a row.
    return order % 2 === 0 ? "numbered-editorial" : "framed-editorial"
  }

  // Story and Reel: vertical, quick-consumption formats where a full-bleed
  // visual is the dominant modern convention (see AGENTS.md's reference
  // recordings) — bias toward it whenever the headline is short enough to
  // read at a glance over an image; fall back to the contained/framed look
  // for longer on-screen text.
  return isShortHeadline ? "hero-full-bleed" : "framed-editorial"
}
