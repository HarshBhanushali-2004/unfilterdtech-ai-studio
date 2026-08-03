import { z } from "zod"

export const generateImageInputSchema = z.object({
  slot: z.string().trim().min(1),
  promptOverride: z.string().trim().min(1).max(4000).optional(),
  forceRegenerate: z.boolean().optional(),
})

export type GenerateImageInput = z.infer<typeof generateImageInputSchema>
