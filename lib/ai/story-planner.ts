import { AIServiceError, extractJson } from "./gemini"
import { toFriendlyAIServiceError } from "./errors"
import { generateWithGemini } from "./gemini-provider"
import { buildStoryPlannerPrompt } from "./story-planner-prompt-builder"
import { storyPlanObjectSchema, type StoryPlanObject } from "./story-planner-schemas"
import type { PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"

/**
 * The Story Planner's Gemini call — Phase 1C's Instagram Story content type
 * (see AGENTS.md). Mirrors `generateCarouselPlan` exactly.
 */
export async function generateStoryPlan(
  topic: string,
  research: ResearchObject,
  planner: PlannerObject,
  brandContext: string
): Promise<StoryPlanObject> {
  const prompt = buildStoryPlannerPrompt(topic, research, planner, brandContext)

  let text: string
  try {
    text = await generateWithGemini({
      prompt,
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    })
  } catch (error) {
    throw toFriendlyAIServiceError(
      error,
      "We couldn't plan this story right now. Please try again in a moment."
    )
  }

  if (!text) {
    throw new AIServiceError("Gemini returned an empty story plan response", 502)
  }

  let parsed
  try {
    parsed = JSON.parse(extractJson(text))
  } catch (error) {
    throw new AIServiceError("Gemini returned invalid story plan JSON", 502, error)
  }

  const validation = storyPlanObjectSchema.safeParse(parsed)

  if (!validation.success) {
    throw new AIServiceError("Gemini story plan response format invalid", 502, validation.error)
  }

  return validation.data
}
