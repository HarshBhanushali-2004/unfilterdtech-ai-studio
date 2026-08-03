export const IMAGE_GENERATION_ERROR_CODES = [
  "QUOTA_EXCEEDED",
  "PROVIDER_UNAVAILABLE",
  "NETWORK_ERROR",
  "TIMEOUT",
  "INVALID_PROMPT",
  "SAFETY_BLOCKED",
  "UNKNOWN",
] as const

export type ImageGenerationErrorCode = (typeof IMAGE_GENERATION_ERROR_CODES)[number]

const FRIENDLY_MESSAGES: Record<ImageGenerationErrorCode, string> = {
  QUOTA_EXCEEDED:
    "The image provider's usage quota has been reached. Try again later or switch providers.",
  PROVIDER_UNAVAILABLE:
    "The image provider is temporarily unavailable. Please try again in a moment.",
  NETWORK_ERROR: "A network error interrupted image generation. Please try again.",
  TIMEOUT: "Image generation timed out. The provider may be under heavy load — try again.",
  INVALID_PROMPT: "This prompt couldn't be processed by the image provider.",
  SAFETY_BLOCKED: "This prompt was blocked by the provider's safety filters.",
  UNKNOWN: "Something went wrong while generating this image.",
}

/**
 * Normalized error every Image Provider (and the Manager) throws — the rest
 * of the app only ever needs to branch on `code` for user-facing messaging,
 * never on provider-specific error shapes.
 */
export class ImageGenerationError extends Error {
  public readonly code: ImageGenerationErrorCode

  constructor(code: ImageGenerationErrorCode, message?: string, public readonly cause?: unknown) {
    super(message ?? FRIENDLY_MESSAGES[code])
    this.name = "ImageGenerationError"
    this.code = code
  }
}

export function friendlyImageErrorMessage(code: ImageGenerationErrorCode): string {
  return FRIENDLY_MESSAGES[code]
}
