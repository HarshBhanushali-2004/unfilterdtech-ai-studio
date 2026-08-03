import type { ImagePromptSpec, VisualPromptObject } from "@/lib/ai/visual-prompt-schemas"

const CAROUSEL_SLOT_PATTERN = /^carousel\.slide\.(\d+)$/

/**
 * Resolves a stable slot identifier (e.g. `post.mainImage`,
 * `carousel.slide.3`) to the `ImagePromptSpec` already produced by the
 * Visual Prompt Engine. Returns `null` for an unknown or out-of-range slot
 * so the API route can respond with 400 instead of throwing. Never builds a
 * new prompt — every prompt this resolves to already exists on the
 * VisualPromptObject.
 */
export function resolveSlotPrompt(
  visualPrompt: VisualPromptObject,
  slot: string
): ImagePromptSpec | null {
  switch (slot) {
    case "post.mainImage":
      return visualPrompt.post.mainImagePrompt
    case "story.background":
      return visualPrompt.story.backgroundPrompt
    case "story.foreground":
      return visualPrompt.story.foregroundElementPrompt
    case "reel.thumbnail":
      return visualPrompt.reel.thumbnailPrompt
    case "reel.cover":
      return visualPrompt.reel.coverPrompt
    default: {
      const match = slot.match(CAROUSEL_SLOT_PATTERN)
      if (!match) return null

      const slideNumber = Number(match[1])
      const slide = visualPrompt.carousel.slides.find((s) => s.slideNumber === slideNumber)
      return slide?.imagePrompt ?? null
    }
  }
}

export function carouselSlot(slideNumber: number): string {
  return `carousel.slide.${slideNumber}`
}
