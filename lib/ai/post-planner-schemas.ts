import { z } from "zod"

const nonEmptyText = z.string().trim().min(1)
const looseText = z.string().trim()

/**
 * The Post Planner's full output — Phase 1C's Instagram Single Post content
 * type (see AGENTS.md). Structurally a one-item version of
 * `CarouselPlanObject` (`lib/ai/carousel-planner-schemas.ts`): the same
 * media-decision fields, no slide array/order/purpose since a post is
 * exactly one designed visual, no NO_MEDIA (a post is fundamentally a
 * visual format — a purely textual "post" doesn't need the visual pipeline
 * at all, it's just the caption).
 */
export const postPlanObjectSchema = z.object({
  category: nonEmptyText,
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  /** Search intent for a future source-media provider — see `carouselPlanSlideSchema`'s matching field. */
  mediaQuery: nonEmptyText,
  /** A complete, standalone AI image generation prompt — always present, used directly for IMAGE and as the fallback when VIDEO can't be safely resolved (see `lib/media-resolver/service.ts`). */
  imageGenerationPrompt: nonEmptyText,
  headline: nonEmptyText,
  body: looseText,
  cta: looseText,
})

export type PostPlanObject = z.infer<typeof postPlanObjectSchema>
