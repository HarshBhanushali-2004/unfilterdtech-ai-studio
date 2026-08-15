import { z } from "zod"

const nonEmptyText = z.string().trim().min(1)
const looseText = z.string().trim()

export const carouselSlideMediaTypes = ["IMAGE", "VIDEO", "NO_MEDIA"] as const
export type CarouselSlideMediaTypeValue = (typeof carouselSlideMediaTypes)[number]

/**
 * One slide of a Carousel Plan — the Carousel Planner's per-slide decision
 * (Phase 1 — AI Carousel Engine, see AGENTS.md). `mediaQuery` and
 * `imageGenerationPrompt` are kept as separate fields even though Phase 1's
 * Media Resolver currently only ever acts on `imageGenerationPrompt` (no
 * real source-media provider is registered yet — see
 * `lib/media-source/manager.ts`): `mediaQuery` is what a future
 * `MediaSourceProvider.search()` call will use, so the planner already
 * produces it rather than needing a prompt-schema change later.
 */
export const carouselPlanSlideSchema = z
  .object({
    order: z.number().int().positive(),
    /** Editorial role of this slide, e.g. "Hook", "Context", "Evidence", "Explanation", "Insight", "CTA" — free text because the AI may choose a structure other than the default progression (see AGENTS.md "Adaptive Storytelling"). */
    purpose: nonEmptyText,
    mediaType: z.enum(carouselSlideMediaTypes),
    /** Search intent for a future source-media provider. Required (non-empty) whenever mediaType is IMAGE or VIDEO; empty string for NO_MEDIA. */
    mediaQuery: looseText,
    /**
     * Always required (non-empty) whenever mediaType is IMAGE or VIDEO —
     * even for VIDEO slides. This is deliberate: Phase 1 has no real video
     * source provider, so the Media Resolver falls back to generating this
     * image when a VIDEO/SOURCE decision can't be safely resolved (see
     * `lib/media-resolver/service.ts`). Empty string for NO_MEDIA.
     */
    imageGenerationPrompt: looseText,
    headline: nonEmptyText,
    /** May be empty for a slide that's primarily visual. */
    body: looseText,
    /** Non-empty only on slides that should show a call to action (typically the last slide). */
    cta: looseText,
    /** Layout/visual direction guidance for the template renderer (e.g. "media dominant, headline overlaid top-left" vs "media as supporting evidence beneath the headline"). */
    visualIntent: nonEmptyText,
  })
  .refine(
    (slide) => slide.mediaType === "NO_MEDIA" || slide.imageGenerationPrompt.length > 0,
    { message: "imageGenerationPrompt is required unless mediaType is NO_MEDIA", path: ["imageGenerationPrompt"] }
  )
  .refine(
    (slide) => slide.mediaType === "NO_MEDIA" || slide.mediaQuery.length > 0,
    { message: "mediaQuery is required unless mediaType is NO_MEDIA", path: ["mediaQuery"] }
  )

export type CarouselPlanSlide = z.infer<typeof carouselPlanSlideSchema>

/**
 * The Carousel Planner's full output — an adaptive, story-driven carousel
 * structure (Phase 1 — AI Carousel Engine, see AGENTS.md). Slide count is
 * never hardcoded: `slideCount` must equal `slides.length`, and slide
 * `order` values must be a contiguous 1..N sequence.
 */
export const carouselPlanObjectSchema = z
  .object({
    title: nonEmptyText,
    category: nonEmptyText,
    objective: nonEmptyText,
    slideCount: z.number().int().positive(),
    slides: z.array(carouselPlanSlideSchema).min(1),
  })
  .refine((plan) => plan.slideCount === plan.slides.length, {
    message: "slideCount must equal the number of slides",
    path: ["slideCount"],
  })
  .refine(
    (plan) => plan.slides.every((slide, index) => slide.order === index + 1),
    { message: "slide order values must be a contiguous 1..N sequence", path: ["slides"] }
  )

export type CarouselPlanObject = z.infer<typeof carouselPlanObjectSchema>
