import { AIServiceError } from "@/lib/ai"
import { ImageGenerationError } from "@/lib/ai/image-providers"

/**
 * Normalizes any error thrown while resolving/rendering one item's media
 * (a carousel slide, a post, a story frame, a reel scene) into a stable
 * error code for `errorCode` columns — shared across every format so a
 * FAILED item's error is always inspectable/loggable the same way,
 * without ever leaking upstream provider details (API keys, raw stack
 * traces) into what gets persisted.
 */
export function errorCodeFor(error: unknown): string {
  if (error instanceof ImageGenerationError) return error.code
  if (error instanceof AIServiceError) return String(error.status)
  return "UNKNOWN"
}

export function errorMessageFor(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
