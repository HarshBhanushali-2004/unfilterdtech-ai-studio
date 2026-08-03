import { AIServiceError } from "./errors"
import { generateWithGemini } from "./gemini-provider"
import { generatedInstagramContentSchema } from "./schemas"
import type { GeneratedInstagramContent } from "./types"

export { AIServiceError } from "./errors"

export function extractJson(content: string) {
  const cleaned = content.trim()

  const fenced = cleaned.match(
    /^```(?:json)?\s*([\s\S]*?)\s*```$/i
  )

  return fenced?.[1] ?? cleaned
}


export async function generateInstagramContent(
  prompt: string
): Promise<GeneratedInstagramContent> {
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

    console.error("Gemini Error:", error)

    throw new AIServiceError(
      error instanceof Error ? error.message : "Gemini request failed",
      502,
      error
    )
  }

  if (!text) {
    throw new AIServiceError(
      "Gemini returned empty response",
      502
    )
  }


  let parsed

  try {
    parsed = JSON.parse(
      extractJson(text)
    )
  } catch(error) {
    throw new AIServiceError(
      "Gemini returned invalid JSON",
      502,
      error
    )
  }


  const validation =
    generatedInstagramContentSchema.safeParse(parsed)


  if (!validation.success) {
    throw new AIServiceError(
      "Gemini response format invalid",
      502,
      validation.error
    )
  }


  return validation.data
}
export async function rewriteContent(
  originalContent: string,
  instruction: string
): Promise<string> {
  const prompt = `
You are an expert social media copywriter.

Rewrite the following content.

Instruction:
${instruction}

Original Content:
${originalContent}

Return ONLY the rewritten content.
No markdown.
No explanation.
No code block.
`

  try {
    const text = await generateWithGemini({ prompt })

    return text.trim()
  } catch (error) {
    if (error instanceof AIServiceError) throw error

    throw new AIServiceError(
      error instanceof Error ? error.message : "Rewrite failed",
      502,
      error
    )
  }
}
