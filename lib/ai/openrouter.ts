import { generatedInstagramContentSchema } from "./schemas"
import type { GeneratedInstagramContent } from "./types"

const OPENROUTER_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"

export class AIServiceError extends Error {
  constructor(message: string, public readonly status: number, public readonly cause?: unknown) {
    super(message)
    this.name = "AIServiceError"
  }
}

type OpenRouterCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
  error?: {
    message?: string
  }
}

function getJsonContent(content: string) {
  const trimmedContent = content.trim()
  const fencedJson = trimmedContent.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fencedJson?.[1] ?? trimmedContent
}

function getErrorMessage(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = payload.error
    if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message
  }
  return "OpenRouter could not complete the request."
}

export async function generateInstagramContent(prompt: string): Promise<GeneratedInstagramContent> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL

  if (!apiKey) throw new AIServiceError("The AI service is not configured. Set OPENROUTER_API_KEY to enable generation.", 503)
  if (!model) throw new AIServiceError("The AI service is not configured. Set OPENROUTER_MODEL to enable generation.", 503)

  let response: Response
  try {
    response = await fetch(OPENROUTER_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
    })
  } catch (error) {
    throw new AIServiceError("Unable to reach the AI service.", 502, error)
  }

  let payload: OpenRouterCompletion
  try {
    payload = (await response.json()) as OpenRouterCompletion
  } catch (error) {
    throw new AIServiceError("The AI service returned an unreadable response.", 502, error)
  }

  if (!response.ok) throw new AIServiceError(getErrorMessage(payload), 502)

  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new AIServiceError("The AI service returned an empty response.", 502)

  let parsedContent: unknown
  try {
    parsedContent = JSON.parse(getJsonContent(content))
  } catch (error) {
    throw new AIServiceError("The AI service returned invalid JSON.", 502, error)
  }

  const validation = generatedInstagramContentSchema.safeParse(parsedContent)
  if (!validation.success) throw new AIServiceError("The AI service returned content in an unexpected format.", 502, validation.error)

  return validation.data
}
