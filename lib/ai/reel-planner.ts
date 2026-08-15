import { AIServiceError, extractJson } from "./gemini"
import { toFriendlyAIServiceError } from "./errors"
import { generateWithGemini } from "./gemini-provider"
import { buildReelPlannerPrompt } from "./reel-planner-prompt-builder"
import { reelPlanObjectSchema, type ReelPlanObject } from "./reel-planner-schemas"
import type { PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"

/**
 * The Reel Planner's Gemini call — Phase 1C's Instagram Reel content type
 * (see AGENTS.md). Mirrors `generateCarouselPlan`/`generateStoryPlan`.
 */
export async function generateReelPlan(
  topic: string,
  research: ResearchObject,
  planner: PlannerObject,
  brandContext: string
): Promise<ReelPlanObject> {
  const prompt = buildReelPlannerPrompt(topic, research, planner, brandContext)

  let text: string
  try {
    text = await generateWithGemini({
      prompt,
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    })
  } catch (error) {
    throw toFriendlyAIServiceError(
      error,
      "We couldn't plan this reel right now. Please try again in a moment."
    )
  }

  if (!text) {
    throw new AIServiceError("Gemini returned an empty reel plan response", 502)
  }

  let parsed
  try {
    parsed = JSON.parse(extractJson(text))
  } catch (error) {
    throw new AIServiceError("Gemini returned invalid reel plan JSON", 502, error)
  }

  const validation = reelPlanObjectSchema.safeParse(parsed)

  if (!validation.success) {
    throw new AIServiceError("Gemini reel plan response format invalid", 502, validation.error)
  }

  return validation.data
}
