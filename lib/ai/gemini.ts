import { GoogleGenerativeAI } from "@google/generative-ai"
import { generatedInstagramContentSchema } from "./schemas"
import type { GeneratedInstagramContent } from "./types"

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = "AIServiceError"
  }
}

function extractJson(content: string) {
  const cleaned = content.trim()

  const fenced = cleaned.match(
    /^```(?:json)?\s*([\s\S]*?)\s*```$/i
  )

  return fenced?.[1] ?? cleaned
}


export async function generateInstagramContent(
  prompt: string
): Promise<GeneratedInstagramContent> {

  const apiKey = process.env.GEMINI_API_KEY
  const modelName =
    process.env.GEMINI_MODEL ?? "gemini-2.5-flash"


  if (!apiKey) {
    throw new AIServiceError(
      "Missing GEMINI_API_KEY",
      503
    )
  }


  const genAI = new GoogleGenerativeAI(apiKey)

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
    },
  })


  let result

  try {
    result = await model.generateContent({
    contents: [
        {
        role: "user",
        parts: [{ text: prompt }],
        },
    ],
    })  } catch (error) {
  console.error("Gemini Error:", error)

  throw new AIServiceError(
    error instanceof Error ? error.message : "Gemini request failed",
    502,
    error
  )
}


  const text =
    result.response.text()


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