import type { ContentType } from "@prisma/client"

import type { VisualPromptObject } from "@/lib/ai"

import { generateImageForSlot } from "./service"
import { carouselSlot, resolveSlotPrompt } from "./slot-resolver"
import type { GeneratedImageDTO } from "./types"

/**
 * Which image slots matter for a given content type. A VisualPromptObject
 * always carries prompts for every format (Feature 5's "always populate
 * every format" convention, mirrored by the Visual Prompt Engine) but a
 * Creation only ever targets one — generating images for formats nobody
 * asked for would just burn Gemini image calls no Review page will show.
 */
function slotsForContentType(contentType: ContentType, visualPrompt: VisualPromptObject): string[] {
  switch (contentType) {
    case "POST":
      return ["post.mainImage"]
    case "STORY":
      return ["story.background", "story.foreground"]
    case "CAROUSEL":
      return visualPrompt.carousel.slides.map((slide) => carouselSlot(slide.slideNumber))
    case "REEL":
      return ["reel.thumbnail", "reel.cover"]
  }
}

export type GenerateImagesForCreationInput = {
  visualPromptId: string
  visualPrompt: VisualPromptObject
  contentType: ContentType
  /** Force every slot to regenerate even if a completed image already exists (the "Regenerate" action). */
  forceRegenerate?: boolean
}

/**
 * Generates every image a Creation's content type needs, in parallel — the
 * "AI generates everything" half of the Review page's "Generated Images"
 * section (see CLAUDE.md Section 11/12). Called once at save time (fresh,
 * `forceRegenerate: false`, so an already-COMPLETED slot is reused) and
 * once per "Regenerate" click (forced fresh on every slot).
 *
 * Best-effort per slot: `generateImageForSlot` never throws — a provider
 * failure persists as that slot's own FAILED status — so one bad image
 * never blocks the others or the caller. Returns whatever slots resolved
 * (an unknown slot, which shouldn't happen for a well-formed
 * VisualPromptObject, is silently skipped rather than thrown).
 */
export async function generateImagesForCreation({
  visualPromptId,
  visualPrompt,
  contentType,
  forceRegenerate = false,
}: GenerateImagesForCreationInput): Promise<GeneratedImageDTO[]> {
  const slots = slotsForContentType(contentType, visualPrompt)

  const results = await Promise.all(
    slots.map((slot) => {
      const promptSpec = resolveSlotPrompt(visualPrompt, slot)
      if (!promptSpec) return null

      return generateImageForSlot({
        visualPromptId,
        slot,
        promptSpec,
        forceRegenerate,
      })
    })
  )

  return results.filter((image): image is GeneratedImageDTO => image !== null)
}
