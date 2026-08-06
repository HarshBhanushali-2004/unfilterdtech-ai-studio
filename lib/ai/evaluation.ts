import { AIServiceError, extractJson } from "./gemini"
import { toFriendlyAIServiceError } from "./errors"
import { generateWithGemini } from "./gemini-provider"
import { buildEvaluationPrompt, type EvaluationContent } from "./evaluation-prompt-builder"
import { evaluationResultSchema, type EvaluationResult } from "./evaluation-schemas"

/**
 * The AI Quality Score + AI Suggestions Gemini call. Runs once per saved
 * creation, evaluating the already-finished content. Never cached (every
 * generation's content is unique) and never used to trigger regeneration.
 */
export async function generateEvaluation(
  content: EvaluationContent,
  brandContext: string
): Promise<EvaluationResult> {
  const prompt = buildEvaluationPrompt(content, brandContext)

  let text: string
  try {
    text = await generateWithGemini({
      prompt,
      generationConfig: {
        responseMimeType: "application/json",
      },
    })
  } catch (error) {
    throw toFriendlyAIServiceError(
      error,
      "We couldn't evaluate this content right now. Please try again in a moment."
    )
  }

  if (!text) {
    throw new AIServiceError("Gemini returned an empty evaluation response", 502)
  }

  let parsed
  try {
    parsed = JSON.parse(extractJson(text))
  } catch (error) {
    throw new AIServiceError("Gemini returned invalid evaluation JSON", 502, error)
  }

  const validation = evaluationResultSchema.safeParse(parsed)

  if (!validation.success) {
    throw new AIServiceError("Gemini evaluation response format invalid", 502, validation.error)
  }

  return validation.data
}
