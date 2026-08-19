import { z } from "zod"

import { visualDirectionSchema } from "./visual-direction-schema"

const nonEmptyText = z.string().trim().min(1)
const looseText = z.string().trim()

export const storyFrameMediaTypes = ["IMAGE", "VIDEO", "NO_MEDIA"] as const

/**
 * One frame of a Story Plan — Phase 1C's Instagram Story content type (see
 * AGENTS.md). Structurally identical to `CarouselPlanSlide`
 * (`lib/ai/carousel-planner-schemas.ts`) — same media-decision fields, same
 * NO_MEDIA allowance — renamed `order`/`purpose` stay, "slide" becomes
 * "frame" only in naming, not in shape, so the two planners' persistence
 * and rendering code can share the same pattern.
 */
export const storyFrameSchema = z
  .object({
    order: z.number().int().positive(),
    /** This frame's narrative role, e.g. "Hook", "Main Information", "Interesting Detail", "CTA" — free text, the AI may adapt the structure to the topic. */
    purpose: nonEmptyText,
    mediaType: z.enum(storyFrameMediaTypes),
    mediaQuery: looseText,
    imageGenerationPrompt: looseText,
    headline: nonEmptyText,
    body: looseText,
    cta: looseText,
    visualIntent: nonEmptyText,
  })
  .refine((frame) => frame.mediaType === "NO_MEDIA" || frame.imageGenerationPrompt.length > 0, {
    message: "imageGenerationPrompt is required unless mediaType is NO_MEDIA",
    path: ["imageGenerationPrompt"],
  })
  .refine((frame) => frame.mediaType === "NO_MEDIA" || frame.mediaQuery.length > 0, {
    message: "mediaQuery is required unless mediaType is NO_MEDIA",
    path: ["mediaQuery"],
  })

export type StoryPlanFrame = z.infer<typeof storyFrameSchema>

/**
 * The Story Planner's full output — an adaptive sequence of frames (never
 * a fixed count), each with its own media decision. `data` on `StoryPlan`
 * (see `prisma/schema.prisma`).
 */
export const storyPlanObjectSchema = z
  .object({
    title: nonEmptyText,
    category: nonEmptyText,
    objective: nonEmptyText,
    /** Shared visual campaign direction (see `visual-direction-schema.ts`) — optional for backward compatibility with plans cached before this field existed. */
    visualDirection: visualDirectionSchema.optional(),
    frameCount: z.number().int().positive(),
    frames: z.array(storyFrameSchema).min(1),
  })
  .refine((plan) => plan.frameCount === plan.frames.length, {
    message: "frameCount must equal the number of frames",
    path: ["frameCount"],
  })
  .refine((plan) => plan.frames.every((frame, index) => frame.order === index + 1), {
    message: "frame order values must be a contiguous 1..N sequence",
    path: ["frames"],
  })

export type StoryPlanObject = z.infer<typeof storyPlanObjectSchema>
