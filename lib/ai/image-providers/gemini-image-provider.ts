import { GoogleGenerativeAIFetchError } from "@google/generative-ai"

import { AIServiceError } from "@/lib/ai/errors"
import { generateImageWithGemini, isQuotaExhaustedError } from "@/lib/ai/gemini-provider"

import { ImageGenerationError } from "./errors"
import { readImageDimensions } from "./image-dimensions"
import type { GenerateImageRequest, ImageProvider, ImageProviderResult } from "./types"

/** Maps any error thrown by the Gemini call into a normalized `ImageGenerationError`. */
function toImageGenerationError(error: unknown): ImageGenerationError {
  if (error instanceof AIServiceError) {
    if (error.status === 422) {
      return new ImageGenerationError("SAFETY_BLOCKED", error.message, error)
    }
    if (error.status === 503) {
      return isQuotaExhaustedError(error.cause) || /quota/i.test(error.message)
        ? new ImageGenerationError("QUOTA_EXCEEDED", error.message, error)
        : new ImageGenerationError("PROVIDER_UNAVAILABLE", error.message, error)
    }
    if (error.status === 400) {
      return new ImageGenerationError("INVALID_PROMPT", error.message, error)
    }
    return new ImageGenerationError("UNKNOWN", error.message, error)
  }

  if (isQuotaExhaustedError(error)) {
    return new ImageGenerationError("QUOTA_EXCEEDED", undefined, error)
  }

  if (error instanceof GoogleGenerativeAIFetchError) {
    if (error.status === 400) {
      return new ImageGenerationError("INVALID_PROMPT", error.message, error)
    }
    if (error.status && error.status >= 500) {
      return new ImageGenerationError("PROVIDER_UNAVAILABLE", error.message, error)
    }
    return new ImageGenerationError("UNKNOWN", error.message, error)
  }

  if (error instanceof TypeError || (error instanceof Error && /fetch|network/i.test(error.message))) {
    return new ImageGenerationError("NETWORK_ERROR", undefined, error)
  }

  return new ImageGenerationError("UNKNOWN", error instanceof Error ? error.message : undefined, error)
}

/**
 * Gemini implementation of the `ImageProvider` contract. Reuses the same
 * multi-key failover manager as every other Gemini call in the app
 * (`generateImageWithGemini`) — this file owns nothing about API keys or
 * retries, only Gemini-specific request shaping and error classification.
 */
export const GeminiImageProvider: ImageProvider = {
  name: "gemini",

  async generateImage(request: GenerateImageRequest): Promise<ImageProviderResult> {
    const startedAt = Date.now()

    try {
      const result = await generateImageWithGemini({ prompt: request.prompt })
      const bytes = Buffer.from(result.base64, "base64")
      const dimensions = readImageDimensions(bytes, result.mimeType)

      return {
        provider: "gemini",
        generationTimeMs: Date.now() - startedAt,
        image: {
          base64: result.base64,
          mimeType: result.mimeType,
          width: dimensions?.width,
          height: dimensions?.height,
        },
      }
    } catch (error) {
      throw toImageGenerationError(error)
    }
  },
}
