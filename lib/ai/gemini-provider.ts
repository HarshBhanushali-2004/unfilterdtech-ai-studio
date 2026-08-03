import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type GenerationConfig,
} from "@google/generative-ai"

import { AIServiceError } from "./errors"

const TEXT_MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
const IMAGE_MODEL_NAME = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image"

// Supports GEMINI_API_KEY_1..N (any gaps are fine — each index is checked
// independently). Personal-use ceiling, not a hard product limit.
const MAX_NUMBERED_KEYS = 20

/**
 * Loads every configured Gemini API key, in order. The legacy GEMINI_API_KEY
 * (no suffix) fills slot 1 whenever GEMINI_API_KEY_1 itself isn't set, so an
 * existing single-key setup keeps working unchanged AND can be extended by
 * simply adding GEMINI_API_KEY_2, _3, ... without renaming anything.
 */
function loadApiKeys(): string[] {
  const keys: string[] = []

  const firstKey = process.env.GEMINI_API_KEY_1?.trim() || process.env.GEMINI_API_KEY?.trim()
  if (firstKey) keys.push(firstKey)

  for (let index = 2; index <= MAX_NUMBERED_KEYS; index++) {
    const key = process.env[`GEMINI_API_KEY_${index}`]?.trim()
    if (key) keys.push(key)
  }

  return keys
}

/**
 * True only for quota-exhaustion errors (HTTP 429 / RESOURCE_EXHAUSTED /
 * "Too Many Requests" / "Quota exceeded"). Every other error — bad key,
 * auth failure, bad request, safety block, parsing error — returns false
 * so the caller fails immediately instead of rotating keys. Exported so
 * other Gemini-backed callers (e.g. the image provider) can classify
 * errors the same way without re-implementing the detection.
 */
export function isQuotaExhaustedError(error: unknown): boolean {
  if (error instanceof GoogleGenerativeAIFetchError && error.status === 429) {
    return true
  }

  const message = error instanceof Error ? error.message : String(error)
  return /RESOURCE_EXHAUSTED|Too Many Requests|Quota exceeded/i.test(message)
}

/**
 * Shared multi-key failover loop: tries each configured Gemini API key in
 * order, running `run(apiKey)` against it. On a quota-exhaustion error it
 * rotates to the next key; any other error is rethrown immediately,
 * unrotated. Both text and image generation go through this so the
 * failover behavior never drifts between the two.
 */
async function runWithKeyFailover<T>(run: (apiKey: string) => Promise<T>): Promise<T> {
  const apiKeys = loadApiKeys()

  if (apiKeys.length === 0) {
    throw new AIServiceError("Missing GEMINI_API_KEY", 503)
  }

  let lastError: unknown

  for (let index = 0; index < apiKeys.length; index++) {
    console.log(`Using Gemini Key #${index + 1}`)

    try {
      return await run(apiKeys[index])
    } catch (error) {
      lastError = error

      if (!isQuotaExhaustedError(error)) {
        throw error
      }

      console.log("Quota exceeded.")

      if (index + 1 < apiKeys.length) {
        console.log(`Switching to Gemini Key #${index + 2}`)
      }
    }
  }

  throw new AIServiceError(
    "All configured Gemini API keys have exhausted their quota.",
    503,
    lastError
  )
}

export type GeminiGenerateOptions = {
  prompt: string
  generationConfig?: GenerationConfig
}

/**
 * The Gemini Provider Manager — the single entry point every Gemini text
 * call in the app goes through (Research, Planner, Visual Prompt Engine,
 * Content Generator, Evaluation, AI Assistant rewrite). Owns API key
 * selection and automatic failover via `runWithKeyFailover`.
 */
export async function generateWithGemini({
  prompt,
  generationConfig,
}: GeminiGenerateOptions): Promise<string> {
  return runWithKeyFailover(async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: TEXT_MODEL_NAME,
      generationConfig,
    })

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    })

    console.log("Request successful.")
    return result.response.text()
  })
}

export type GeminiImageGenerateOptions = {
  prompt: string
  /** e.g. "1:1", "4:5", "9:16" — passed through as a hint in the prompt context only; Gemini image output does not take a dedicated aspect-ratio parameter today. */
  aspectRatio?: string
}

export type GeminiImageResult = {
  base64: string
  mimeType: string
}

/**
 * True when Gemini refused to produce an image on safety grounds — either
 * blocked before generation (`promptFeedback.blockReason`) or during
 * generation (a candidate finishing with `finishReason === "SAFETY"`).
 */
function isSafetyBlocked(response: {
  promptFeedback?: { blockReason?: string } | null
  candidates?: Array<{ finishReason?: string }> | null
}): boolean {
  if (response.promptFeedback?.blockReason) return true
  return (response.candidates ?? []).some((candidate) => candidate.finishReason === "SAFETY")
}

/**
 * Image counterpart to `generateWithGemini` — same key-failover manager,
 * targeting Gemini's native image-output model (`GEMINI_IMAGE_MODEL`,
 * default `gemini-2.5-flash-image`) via the same `generateContent` call
 * used for text, requesting an image response modality and extracting the
 * first inline image part. The installed `@google/generative-ai` SDK
 * predates first-class typing for `responseModalities`, so it's supplied
 * via a type cast — the SDK JSON-serializes `generationConfig` as-is, so
 * the extra field reaches the API untouched.
 */
export async function generateImageWithGemini({
  prompt,
}: GeminiImageGenerateOptions): Promise<GeminiImageResult> {
  return runWithKeyFailover(async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: IMAGE_MODEL_NAME,
      generationConfig: {
        responseModalities: ["IMAGE"],
      } as GenerationConfig,
    })

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    })

    const response = result.response

    if (isSafetyBlocked(response)) {
      throw new AIServiceError(
        "Gemini declined to generate this image (safety filters).",
        422
      )
    }

    const parts = response.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find(
      (part): part is typeof part & { inlineData: { mimeType: string; data: string } } =>
        "inlineData" in part && !!part.inlineData
    )

    if (!imagePart) {
      throw new AIServiceError("Gemini did not return an image for this prompt.", 502)
    }

    console.log("Image request successful.")

    return {
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/png",
    }
  })
}
