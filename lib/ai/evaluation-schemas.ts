import { z } from "zod"

const score = z.number().min(0).max(100)

export const qualityScoreSchema = z.object({
  overall: score,
  hook: score,
  clarity: score,
  engagement: score,
  virality: score,
  readability: score,
  educationalValue: score,
  brandAlignment: score,
  ctaQuality: score,
  confidence: score,
})

export type QualityScore = z.infer<typeof qualityScoreSchema>

/**
 * Single source of truth for the Quality Score's fields and their
 * human-readable labels — shared by the Creation Details Quality Score panel.
 */
export const QUALITY_SCORE_FIELDS: Array<{ key: keyof QualityScore; label: string }> = [
  { key: "hook", label: "Hook" },
  { key: "clarity", label: "Clarity" },
  { key: "engagement", label: "Engagement" },
  { key: "virality", label: "Virality" },
  { key: "readability", label: "Readability" },
  { key: "educationalValue", label: "Educational Value" },
  { key: "brandAlignment", label: "Brand Alignment" },
  { key: "ctaQuality", label: "CTA Quality" },
  { key: "confidence", label: "Confidence" },
]

export const suggestionSchema = z.object({
  label: z.string().trim().min(1),
  detail: z.string().trim().min(1),
})

export type Suggestion = z.infer<typeof suggestionSchema>

export const evaluationResultSchema = z.object({
  scores: qualityScoreSchema,
  suggestions: z.array(suggestionSchema),
})

export type EvaluationResult = z.infer<typeof evaluationResultSchema>
