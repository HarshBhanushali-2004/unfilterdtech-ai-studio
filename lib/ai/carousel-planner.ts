import { AIServiceError, extractJson } from "./gemini"
import { toFriendlyAIServiceError } from "./errors"
import { generateWithGemini } from "./gemini-provider"
import { buildCarouselPlannerPrompt } from "./carousel-planner-prompt-builder"
import { carouselPlanObjectSchema, type CarouselPlanObject } from "./carousel-planner-schemas"
import type { PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"

/**
 * The Carousel Planner's Gemini call — Phase 1's AI Carousel Engine (see
 * AGENTS.md). Turns Research + Planner strategy into an adaptive,
 * story-driven carousel plan. Goes through the same `generateWithGemini`
 * resilience pipeline (retry/key-rotation/model-fallback) as every other
 * Gemini text call in the app — no separate client, no separate key
 * handling.
 */
export async function generateCarouselPlan(
  topic: string,
  research: ResearchObject,
  planner: PlannerObject,
  brandContext: string
): Promise<CarouselPlanObject> {
  const prompt = buildCarouselPlannerPrompt(topic, research, planner, brandContext)

  let text: string
  try {
    text = await generateWithGemini({
      prompt,
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    })
  } catch (error) {
    throw toFriendlyAIServiceError(
      error,
      "We couldn't plan this carousel right now. Please try again in a moment."
    )
  }

  if (!text) {
    throw new AIServiceError("Gemini returned an empty carousel plan response", 502)
  }

  let parsed
  try {
    parsed = JSON.parse(extractJson(text))
  } catch (error) {
    throw new AIServiceError("Gemini returned invalid carousel plan JSON", 502, error)
  }

  const validation = carouselPlanObjectSchema.safeParse(parsed)

  if (!validation.success) {
    throw new AIServiceError("Gemini carousel plan response format invalid", 502, validation.error)
  }

  return validation.data
}
