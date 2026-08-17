import { IMAGE_GENERATION_ERROR_CODES, friendlyImageErrorMessage, type ImageGenerationErrorCode } from "@/lib/ai/image-providers"

const IMAGE_ERROR_CODE_SET = new Set<string>(IMAGE_GENERATION_ERROR_CODES)

function isImageGenerationErrorCode(code: string): code is ImageGenerationErrorCode {
  return IMAGE_ERROR_CODE_SET.has(code)
}

const HTTP_STATUS_MESSAGES: Record<string, string> = {
  "429": "The AI provider is receiving too many requests right now.",
  "503": "The AI provider is temporarily unavailable.",
  "500": "The AI provider ran into an internal error.",
}

/**
 * Turns a persisted `errorCode` (`CarouselSlideMedia.errorCode` and its
 * Post/Story/Reel siblings — see `lib/format-media/errors.ts`'s
 * `errorCodeFor`) into copy that's safe to show inside a review UI.
 *
 * This exists because every gallery (`CarouselSlidesGallery`,
 * `PostMediaPreview`, `StoryFramesGallery`, `ReelScenesGallery`) used to
 * render the raw `errorMessage` — the *provider's own* text, e.g. Together.ai's
 * full rate-limit paragraph with a docs URL — directly inside the media tile,
 * indistinguishable from real generated content (Phase 1C.6 QA: "provider
 * error is displayed as content"). `errorCode` already carries a stable,
 * provider-agnostic classification (`ImageGenerationErrorCode` when the
 * failure came from an image provider, a stringified HTTP status when it
 * came from `AIServiceError`, or `"UNKNOWN"`), so this maps that to the same
 * kind of friendly, non-technical copy `friendlyImageErrorMessage` already
 * provides for the legacy `GeneratedImage` pipeline — reused here rather
 * than duplicated. The raw `errorMessage` is never shown by default; it's
 * only surfaced behind an explicit disclosure toggle (see
 * `MediaFailedState`) for debugging.
 */
export function friendlyMediaErrorMessage(errorCode: string | null | undefined): string {
  if (!errorCode) return "Something went wrong while generating this media."
  if (isImageGenerationErrorCode(errorCode)) return friendlyImageErrorMessage(errorCode)
  return HTTP_STATUS_MESSAGES[errorCode] ?? "Something went wrong while generating this media."
}
