import { AIServiceError, extractJson } from "./gemini"
import { generateWithGemini } from "./gemini-provider"
import { buildResearchPrompt } from "./research-prompt-builder"
import { researchObjectSchema, type ResearchObject } from "./research-schemas"

/**
 * The Research Engine's Gemini call — synthesizes a structured, brand-agnostic
 * knowledge brief for a topic. This is a distinct call from
 * `generateInstagramContent`: different prompt, different output schema, and
 * (via the Research Engine's cache) called far less often per topic.
 */
export async function generateResearch(
  topic: string,
  context: string[] = []
): Promise<ResearchObject> {
  const prompt = buildResearchPrompt(topic, context)

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

    console.error("Gemini Research Error:", error)

    throw new AIServiceError(
      error instanceof Error ? error.message : "Gemini research request failed",
      502,
      error
    )
  }

  if (!text) {
    throw new AIServiceError("Gemini returned an empty research response", 502)
  }

  let parsed
  try {
    parsed = JSON.parse(extractJson(text))
  } catch (error) {
    throw new AIServiceError("Gemini returned invalid research JSON", 502, error)
  }

  const validation = researchObjectSchema.safeParse(parsed)

  if (!validation.success) {
    throw new AIServiceError("Gemini research response format invalid", 502, validation.error)
  }

  return validation.data
}
