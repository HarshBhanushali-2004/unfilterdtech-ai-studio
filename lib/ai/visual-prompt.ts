import { AIServiceError, extractJson } from "./gemini"
import { generateWithGemini } from "./gemini-provider"
import type { PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"
import { buildVisualPromptPrompt } from "./visual-prompt-prompt-builder"
import { visualPromptObjectSchema, type VisualPromptObject } from "./visual-prompt-schemas"

/**
 * The Visual Prompt Engine's Gemini call — turns Research + Planner strategy
 * into production-ready AI image prompts for every content format. The
 * response is considerably larger than Research/Planner/Content (many
 * 250-600 word prompts across post/story/carousel/reel), so this raises
 * `maxOutputTokens` well above the other calls to avoid truncation.
 */
export async function generateVisualPrompt(
  research: ResearchObject,
  planner: PlannerObject,
  brandContext: string
): Promise<VisualPromptObject> {
  const prompt = buildVisualPromptPrompt(research, planner, brandContext)

  let text: string
  try {
    text = await generateWithGemini({
      prompt,
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
      },
    })
  } catch (error) {
    if (error instanceof AIServiceError) throw error

    console.error("Gemini Visual Prompt Error:", error)

    throw new AIServiceError(
      error instanceof Error ? error.message : "Gemini visual prompt request failed",
      502,
      error
    )
  }

  if (!text) {
    throw new AIServiceError("Gemini returned an empty visual prompt response", 502)
  }

  let parsed
  try {
    parsed = JSON.parse(extractJson(text))
  } catch (error) {
    throw new AIServiceError("Gemini returned invalid visual prompt JSON", 502, error)
  }

  const validation = visualPromptObjectSchema.safeParse(parsed)

  if (!validation.success) {
    throw new AIServiceError("Gemini visual prompt response format invalid", 502, validation.error)
  }

  return validation.data
}
