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
        // Matches lib/ai/visual-prompt.ts's own `maxOutputTokens` — a
        // carousel can run up to ~10 slides, and each slide's
        // "imageGenerationPrompt" is now a full structured prompt (Subject/
        // Visual concept/Environment/Composition/Camera/Lighting/Mood/Color/
        // Brand direction — see lib/ai/image-prompt-guidelines.ts), not the
        // short one-liner this field used to be. 8192 was fine before that
        // change; a large, verbose carousel can now plausibly approach or
        // exceed it, truncating the JSON mid-object. A truncated response
        // already fails safely (JSON.parse throws → wrapped as a proper
        // AIServiceError below, never a raw client-side parse error — see
        // ABOUT.md's Studio generation reliability section), but it still
        // means a real, avoidable generation failure for exactly the
        // longest, most content-heavy format.
        maxOutputTokens: 16384,
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
