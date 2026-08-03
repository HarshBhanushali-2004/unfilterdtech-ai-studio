import { z } from "zod"

const nonEmptyText = z.string().trim().min(1)
const looseText = z.string().trim()
const stringArray = z.array(nonEmptyText)

/**
 * A single production-ready AI image prompt, engineered to work across
 * Gemini Image, Imagen, FLUX, Stable Diffusion, DALL-E, Midjourney, and
 * future providers. `fullPrompt` is the assembled, copy-paste-ready prompt
 * text (see Feature 4: ~250-600 words); the other fields are the structured
 * breakdown of the same prompt for display.
 */
export const imagePromptSpecSchema = z.object({
  subject: nonEmptyText,
  composition: nonEmptyText,
  framing: nonEmptyText,
  cameraAngle: nonEmptyText,
  lensSuggestion: nonEmptyText,
  lighting: nonEmptyText,
  colorPalette: nonEmptyText,
  environment: nonEmptyText,
  mood: nonEmptyText,
  cinematicStyle: nonEmptyText,
  renderingStyle: nonEmptyText,
  /** Empty string when the image has no on-image text/layout needs. */
  typographyGuidance: looseText,
  negativePrompt: nonEmptyText,
  aspectRatio: nonEmptyText,
  qualityKeywords: stringArray,
  fullPrompt: nonEmptyText,
})

export type ImagePromptSpec = z.infer<typeof imagePromptSpecSchema>

export const postVisualAssetsSchema = z.object({
  mainImagePrompt: imagePromptSpecSchema,
  layoutRecommendation: nonEmptyText,
  typographyRecommendation: nonEmptyText,
  visualHierarchy: nonEmptyText,
  designDirection: nonEmptyText,
})

export type PostVisualAssets = z.infer<typeof postVisualAssetsSchema>

export const storyVisualAssetsSchema = z.object({
  backgroundPrompt: imagePromptSpecSchema,
  foregroundElementPrompt: imagePromptSpecSchema,
  ctaPlacement: nonEmptyText,
  pollOrQuestionStickerSuggestion: nonEmptyText,
  swipeUpOrLinkPlacement: nonEmptyText,
  safeAreaRecommendation: nonEmptyText,
})

export type StoryVisualAssets = z.infer<typeof storyVisualAssetsSchema>

export const carouselSlideVisualSchema = z.object({
  slideNumber: z.number().int().positive(),
  slideTitle: nonEmptyText,
  contentObjective: nonEmptyText,
  visualIdea: nonEmptyText,
  imagePrompt: imagePromptSpecSchema,
  layoutSuggestion: nonEmptyText,
  /** Populated only on the final slide; empty string otherwise. */
  cta: looseText,
  /** Populated only on the final slide; empty string otherwise. */
  branding: looseText,
})

export type CarouselSlideVisual = z.infer<typeof carouselSlideVisualSchema>

export const carouselVisualAssetsSchema = z.object({
  slides: z.array(carouselSlideVisualSchema).min(1),
})

export type CarouselVisualAssets = z.infer<typeof carouselVisualAssetsSchema>

export const reelSceneVisualSchema = z.object({
  sceneNumber: z.number().int().positive(),
  cameraMovement: nonEmptyText,
  transitionSuggestion: nonEmptyText,
  bRollIdeas: stringArray,
  voiceoverScript: nonEmptyText,
  subtitleScript: nonEmptyText,
  onScreenText: nonEmptyText,
})

export type ReelSceneVisual = z.infer<typeof reelSceneVisualSchema>

export const reelProductionPlanSchema = z.object({
  hook: nonEmptyText,
  estimatedDuration: nonEmptyText,
  totalScenes: z.number().int().positive(),
  scenes: z.array(reelSceneVisualSchema).min(1),
  musicMood: nonEmptyText,
  endingCta: nonEmptyText,
  thumbnailPrompt: imagePromptSpecSchema,
  coverPrompt: imagePromptSpecSchema,
})

export type ReelProductionPlan = z.infer<typeof reelProductionPlanSchema>

/**
 * The Visual Prompt Engine's full output — production plans and image
 * prompts for every content format, generated in one call (matching the
 * Instagram Content Generator's existing "always populate every format"
 * convention) so the Visual Assets panel can show whichever format the
 * saved creation used.
 */
export const visualPromptObjectSchema = z.object({
  post: postVisualAssetsSchema,
  story: storyVisualAssetsSchema,
  carousel: carouselVisualAssetsSchema,
  reel: reelProductionPlanSchema,
})

export type VisualPromptObject = z.infer<typeof visualPromptObjectSchema>
