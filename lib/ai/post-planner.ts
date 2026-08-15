import { AIServiceError, extractJson } from "./gemini"
import { toFriendlyAIServiceError } from "./errors"
import { generateWithGemini } from "./gemini-provider"
import { buildPostPlannerPrompt } from "./post-planner-prompt-builder"
import { postPlanObjectSchema, type PostPlanObject } from "./post-planner-schemas"
import type { PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"

/**
 * The Post Planner's Gemini call — Phase 1C's Instagram Single Post content
 * type (see AGENTS.md). Goes through the same `generateWithGemini`
 * resilience pipeline (retry/key-rotation/model-fallback) as every other
 * Gemini text call in the app.
 */
export async function generatePostPlan(
  topic: string,
  research: ResearchObject,
  planner: PlannerObject,
  brandContext: string
): Promise<PostPlanObject> {
  const prompt = buildPostPlannerPrompt(topic, research, planner, brandContext)

  let text: string
  try {
    text = await generateWithGemini({
      prompt,
      generationConfig: { responseMimeType: "application/json" },
    })
  } catch (error) {
    throw toFriendlyAIServiceError(
      error,
      "We couldn't plan this post right now. Please try again in a moment."
    )
  }

  if (!text) {
    throw new AIServiceError("Gemini returned an empty post plan response", 502)
  }

  let parsed
  try {
    parsed = JSON.parse(extractJson(text))
  } catch (error) {
    throw new AIServiceError("Gemini returned invalid post plan JSON", 502, error)
  }

  const validation = postPlanObjectSchema.safeParse(parsed)

  if (!validation.success) {
    throw new AIServiceError("Gemini post plan response format invalid", 502, validation.error)
  }

  return validation.data
}
