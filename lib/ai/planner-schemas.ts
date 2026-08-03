import { z } from "zod"

const nonEmptyText = z.string().trim().min(1)
const stringArray = z.array(nonEmptyText)

export const contentComplexityLevels = ["beginner", "intermediate", "expert"] as const
export type ContentComplexityLevel = (typeof contentComplexityLevels)[number]

export const keywordIntelligenceSchema = z.object({
  primaryKeywords: stringArray,
  secondaryKeywords: stringArray,
  lsiKeywords: stringArray,
  semanticKeywords: stringArray,
  searchIntent: nonEmptyText,
})

export type KeywordIntelligence = z.infer<typeof keywordIntelligenceSchema>

export const plannerObjectSchema = z.object({
  targetAudience: nonEmptyText,
  audiencePainPoints: stringArray,
  audienceIntent: nonEmptyText,
  contentObjective: nonEmptyText,

  toneRecommendation: nonEmptyText,
  emotionalDirection: nonEmptyText,

  hookStrategy: nonEmptyText,
  ctaStrategy: nonEmptyText,
  storytellingFramework: nonEmptyText,

  marketingAngle: nonEmptyText,
  educationalAngle: nonEmptyText,
  viralAngle: nonEmptyText,

  suggestedVisualDirection: nonEmptyText,
  suggestedThumbnailIdea: nonEmptyText,

  contentComplexity: z.enum(contentComplexityLevels),
  bestContentLength: nonEmptyText,
  suggestedPostingStrategy: nonEmptyText,

  keywordIntelligence: keywordIntelligenceSchema,
})

export type PlannerObject = z.infer<typeof plannerObjectSchema>

/**
 * Single source of truth for the Planner Object's scalar strategy fields and
 * their human-readable labels — shared by the content Prompt Builder and the
 * Creation Details Planner panel so the two never drift apart.
 */
export const PLANNER_TEXT_FIELDS: Array<{
  key: Exclude<keyof PlannerObject, "audiencePainPoints" | "keywordIntelligence" | "contentComplexity">
  label: string
}> = [
  { key: "targetAudience", label: "Target Audience" },
  { key: "audienceIntent", label: "Audience Intent" },
  { key: "contentObjective", label: "Content Objective" },
  { key: "toneRecommendation", label: "Tone Recommendation" },
  { key: "emotionalDirection", label: "Emotional Direction" },
  { key: "hookStrategy", label: "Hook Strategy" },
  { key: "ctaStrategy", label: "CTA Strategy" },
  { key: "storytellingFramework", label: "Storytelling Framework" },
  { key: "marketingAngle", label: "Marketing Angle" },
  { key: "educationalAngle", label: "Educational Angle" },
  { key: "viralAngle", label: "Viral Angle" },
  { key: "suggestedVisualDirection", label: "Suggested Visual Direction" },
  { key: "suggestedThumbnailIdea", label: "Suggested Thumbnail Idea" },
  { key: "bestContentLength", label: "Best Content Length" },
  { key: "suggestedPostingStrategy", label: "Suggested Posting Strategy" },
]
