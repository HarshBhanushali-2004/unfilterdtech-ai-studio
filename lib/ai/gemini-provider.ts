import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type GenerationConfig,
} from "@google/generative-ai"

import { AIServiceError } from "./errors"

const DEFAULT_TEXT_MODEL = "gemini-2.5-flash"
const IMAGE_MODEL_NAME = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image"

// Supports GEMINI_API_KEY_1..N (any gaps are fine — each index is checked
// independently). Personal-use ceiling, not a hard product limit.
const MAX_NUMBERED_KEYS = 20

// Exponential backoff between retries of the *same* key/model on a
// transient failure: 500ms, then 1s, then 2s. Three retries (four attempts
// total) before giving up on this key and rotating to the next one.
const RETRY_DELAYS_MS = [500, 1000, 2000]

// Models tried, in order, once every configured API key has failed on the
// current model. The primary model (GEMINI_MODEL, default gemini-2.5-flash)
// always goes first; GEMINI_MODEL_FALLBACKS (comma-separated) lets ops
// extend the chain without a code change, and these built-ins are appended
// so there's always a documented, currently-supported model left to try.
const BUILT_IN_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash"]

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
 * Builds the ordered model fallback chain: the configured primary model,
 * then any GEMINI_MODEL_FALLBACKS entries, then the built-in defaults —
 * de-duplicated so a model already earlier in the chain is never retried
 * as if it were a fresh fallback.
 */
function loadModelChain(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_TEXT_MODEL
  const configuredFallbacks = (process.env.GEMINI_MODEL_FALLBACKS ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean)

  const chain = [primary, ...configuredFallbacks, ...BUILT_IN_MODEL_FALLBACKS]

  return chain.filter((model, index) => chain.indexOf(model) === index)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])
const RETRYABLE_SYSTEM_ERROR_CODES = /ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/
const RETRYABLE_MESSAGE_PATTERN =
  /\b(429|500|502|503|504)\b|Too Many Requests|RESOURCE_EXHAUSTED|Quota exceeded|Service Unavailable|high demand|Internal Server Error|Bad Gateway|Gateway Timeout|ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|network error|fetch failed/i

/**
 * True for transient failures worth retrying/rotating for: rate limiting
 * (429), server-side/gateway errors (500/502/503/504), and low-level
 * network failures (connection reset, timeout, DNS, a bare fetch failure).
 * Everything else (bad request, invalid/revoked key, safety block, response
 * parsing error) returns false, so the caller fails immediately instead of
 * burning through the retry/key/model budget on a request that can never
 * succeed no matter how many times it's replayed.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof GoogleGenerativeAIFetchError && typeof error.status === "number") {
    return RETRYABLE_STATUS_CODES.has(error.status)
  }

  const systemErrorCode =
    (error as { code?: string })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code

  if (systemErrorCode && RETRYABLE_SYSTEM_ERROR_CODES.test(systemErrorCode)) {
    return true
  }

  const message = error instanceof Error ? error.message : String(error)
  return RETRYABLE_MESSAGE_PATTERN.test(message)
}

/**
 * True only for quota-exhaustion errors (HTTP 429 / RESOURCE_EXHAUSTED /
 * "Too Many Requests" / "Quota exceeded"). Narrower than `isTransientError`
 * — kept for callers (the image provider) that need to distinguish "this
 * key is out of quota" from "the provider is generally unavailable" for
 * user-facing messaging, not for retry decisions.
 */
export function isQuotaExhaustedError(error: unknown): boolean {
  if (error instanceof GoogleGenerativeAIFetchError && error.status === 429) {
    return true
  }

  const message = error instanceof Error ? error.message : String(error)
  return /RESOURCE_EXHAUSTED|Too Many Requests|Quota exceeded/i.test(message)
}

/**
 * Runs `run` against a single key/model pair, retrying transient failures
 * with exponential backoff (500ms, 1s, 2s). A non-transient error is
 * rethrown immediately without waiting. Once retries are exhausted the last
 * transient error is rethrown so the caller (key/model failover) can decide
 * what to do next.
 */
async function runWithRetry<T>(run: () => Promise<T>, label: string): Promise<T> {
  const maxAttempts = RETRY_DELAYS_MS.length + 1

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await run()
    } catch (error) {
      if (!isTransientError(error)) throw error

      const detail = error instanceof Error ? error.message : String(error)

      if (attempt === maxAttempts) {
        console.warn(`[Gemini] ${label} — retries exhausted after ${maxAttempts} attempts: ${detail}`)
        throw error
      }

      const delay = RETRY_DELAYS_MS[attempt - 1]
      console.warn(
        `[Gemini] ${label} — transient error on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms: ${detail}`
      )
      await sleep(delay)
    }
  }

  // Unreachable — the loop above always returns or throws.
  throw new Error("runWithRetry: exhausted attempts without returning or throwing")
}

/**
 * Tries every configured Gemini API key, in order, against `modelName`.
 * Each key gets the full retry/backoff treatment via `runWithRetry` before
 * being considered failed. A non-transient error aborts immediately without
 * rotating; a transient error rotates to the next key once retries on the
 * current one are exhausted.
 */
async function runWithKeyFailover<T>(
  modelName: string,
  run: (apiKey: string) => Promise<T>
): Promise<T> {
  const apiKeys = loadApiKeys()

  if (apiKeys.length === 0) {
    throw new AIServiceError("Missing GEMINI_API_KEY", 503)
  }

  let lastError: unknown

  for (let index = 0; index < apiKeys.length; index++) {
    const label = `key #${index + 1}/${apiKeys.length} (model ${modelName})`
    console.log(`[Gemini] Trying ${label}`)

    try {
      const result = await runWithRetry(() => run(apiKeys[index]), label)
      console.log(`[Gemini] Request succeeded on ${label}`)
      return result
    } catch (error) {
      lastError = error

      if (!isTransientError(error)) throw error

      if (index + 1 < apiKeys.length) {
        console.warn(`[Gemini] ${label} exhausted — rotating to key #${index + 2}`)
      } else {
        console.warn(`[Gemini] ${label} exhausted — no keys left for model ${modelName}`)
      }
    }
  }

  throw lastError
}

/**
 * Tries every model in the fallback chain (primary model first), running
 * every configured API key against each one via `runWithKeyFailover`. Only
 * once every key has failed transiently on every model does this throw the
 * single, friendly `AIServiceError` that route handlers forward to the
 * client — the raw upstream error is attached as `cause` for logging only,
 * never surfaced in the message.
 */
async function runWithModelFailover<T>(
  run: (apiKey: string, modelName: string) => Promise<T>
): Promise<T> {
  const models = loadModelChain()
  let lastError: unknown

  for (let index = 0; index < models.length; index++) {
    const modelName = models[index]

    try {
      return await runWithKeyFailover(modelName, (apiKey) => run(apiKey, modelName))
    } catch (error) {
      lastError = error

      if (!isTransientError(error)) throw error

      if (index + 1 < models.length) {
        console.warn(`[Gemini] Model ${modelName} exhausted on every key — falling back to ${models[index + 1]}`)
      } else {
        console.error(`[Gemini] Every configured key and model failed. Last error:`, error)
      }
    }
  }

  throw new AIServiceError(
    "Our AI provider is experiencing heavy demand right now. Please try again in a moment.",
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
 * Content Generator, Evaluation, AI Assistant rewrite). Resilient by
 * default: transient failures are retried with exponential backoff, then
 * failed over across every configured API key, then across a model
 * fallback chain — see `runWithModelFailover`/`runWithKeyFailover`/
 * `runWithRetry` above. Callers only ever see either the generated text or
 * an `AIServiceError` with a message that's already safe to show a user.
 */
export async function generateWithGemini({
  prompt,
  generationConfig,
}: GeminiGenerateOptions): Promise<string> {
  return runWithModelFailover(async (apiKey, modelName) => {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig,
    })

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    })

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
 * Image counterpart to `generateWithGemini` — same retry/backoff + key
 * failover treatment (no model fallback chain; image generation targets a
 * single configured model, `GEMINI_IMAGE_MODEL`), requesting an image
 * response modality and extracting the first inline image part. The
 * installed `@google/generative-ai` SDK predates first-class typing for
 * `responseModalities`, so it's supplied via a type cast — the SDK
 * JSON-serializes `generationConfig` as-is, so the extra field reaches the
 * API untouched.
 */
export async function generateImageWithGemini({
  prompt,
}: GeminiImageGenerateOptions): Promise<GeminiImageResult> {
  return runWithKeyFailover(IMAGE_MODEL_NAME, async (apiKey) => {
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

    console.log("[Gemini] Image request successful.")

    return {
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/png",
    }
  })
}
