import { AIServiceError, extractJson } from "./gemini"
import { generateWithGemini } from "./gemini-provider"
import { buildPlannerPrompt } from "./planner-prompt-builder"
import { plannerObjectSchema, type PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"

/**
 * The AI Planner's Gemini call — turns a Research brief into a strategic
 * content plan (audience framing, hook/CTA strategy, keyword intelligence).
 * Distinct from both `generateResearch` (facts, brand-agnostic) and
 * `generateInstagramContent` (finished copy).
 */
export async function generatePlanner(
  research: ResearchObject,
  brandContext: string,
  tone: string,
  creativity: number
): Promise<PlannerObject> {
  const prompt = buildPlannerPrompt(research, brandContext, tone, creativity)

  let text: string
  try {
    text = await generateWithGemini({
      prompt,
      generationConfig: {
        responseMimeType: "application/json",
      },
    })
  } catch (error) {
    if (error instanceof AIServiceError) throw error

    console.error("Gemini Planner Error:", error)

    throw new AIServiceError(
      error instanceof Error ? error.message : "Gemini planner request failed",
      502,
      error
    )
  }

  if (!text) {
    throw new AIServiceError("Gemini returned an empty planner response", 502)
  }

  let parsed
  try {
    parsed = JSON.parse(extractJson(text))
  } catch (error) {
    throw new AIServiceError("Gemini returned invalid planner JSON", 502, error)
  }

  const validation = plannerObjectSchema.safeParse(parsed)

  if (!validation.success) {
    throw new AIServiceError("Gemini planner response format invalid", 502, validation.error)
  }

  return validation.data
}
