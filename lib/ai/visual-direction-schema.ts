import { z } from "zod"

const nonEmptyText = z.string().trim().min(1)

/**
 * A carousel/story/reel's shared visual campaign direction — decided once
 * by the Planner before any individual slide/frame/scene's own image prompt
 * is written, so the whole sequence reads as one professionally
 * art-directed campaign instead of independent, unrelated AI images (the
 * image-generation quality pass — see ABOUT.md). Every item's own
 * `imageGenerationPrompt` is instructed to apply this same style/lighting/
 * color/mood/photography language while still being a distinct shot.
 *
 * `.optional()` wherever it's used on a plan object: a `CarouselPlan`/
 * `StoryPlan`/`ReelPlan` row cached before this field existed simply has
 * none, and its own items keep using their independently-written prompts
 * exactly as before — no migration, no backfill, no broken cache reads.
 */
export const visualDirectionSchema = z.object({
  style: nonEmptyText,
  realism: nonEmptyText,
  lighting: nonEmptyText,
  color: nonEmptyText,
  mood: nonEmptyText,
  composition: nonEmptyText,
  photography: nonEmptyText,
})

export type VisualDirection = z.infer<typeof visualDirectionSchema>
