import { z } from "zod"

import { contentTypes, sourceTypes, type GenerateContentInput, type GeneratedInstagramContent } from "./types"

const nonEmptyText = z.string().trim().min(1)

export const carouselSlideSchema = z.object({
  slideNumber: z.number().int().positive(),
  headline: nonEmptyText,
  body: nonEmptyText,
  visualSuggestion: nonEmptyText,
})

export const storyFrameSchema = z.object({
  frameNumber: z.number().int().positive(),
  text: nonEmptyText,
  visualSuggestion: nonEmptyText,
})

export const reelSceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  visual: nonEmptyText,
  narration: nonEmptyText,
})

export const reelContentSchema = z.object({
  hook: nonEmptyText,
  script: nonEmptyText,
  scenes: z.array(reelSceneSchema).min(1),
})

export const generatedInstagramContentSchema: z.ZodType<GeneratedInstagramContent> = z.object({
  caption: nonEmptyText,
  hashtags: z.array(nonEmptyText).min(1),
  carousel: z.array(carouselSlideSchema).min(1),
  story: z.array(storyFrameSchema).min(1),
  reel: reelContentSchema,
})

export const generateContentInputSchema: z.ZodType<GenerateContentInput> = z.object({
  sourceType: z.enum(sourceTypes),
  input: z.string().trim().min(1).max(12_000),
  contentTypes: z.array(z.enum(contentTypes)).min(1).max(contentTypes.length),
  tone: z.string().trim().min(1).max(80),
  creativity: z.number().int().min(0).max(100),
  projectId: z.string().trim().min(1).optional(),
  researchId: z.string().trim().min(1).optional(),
  plannerId: z.string().trim().min(1).optional(),
  visualPromptId: z.string().trim().min(1).optional(),
})
