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

/**
 * Wraps an unknown error thrown by a Gemini call as a client-safe
 * `AIServiceError`. Every Gemini call site (content generation, rewrite,
 * research, planner, evaluation, visual prompt) funnels its catch block
 * through this instead of forwarding `error.message` directly — a raw
 * `GoogleGenerativeAIError`/`GoogleGenerativeAIFetchError` message can
 * contain upstream implementation details ("[503 Service Unavailable]
 * Model is currently experiencing high demand.") that should never reach
 * the browser. The original error is preserved as `cause` and logged here
 * so failures stay debuggable internally; only `friendlyMessage` is ever
 * surfaced to a route handler's JSON response.
 *
 * If `error` is already an `AIServiceError` it's passed through unchanged
 * — `lib/ai/gemini-provider.ts` already constructs those with a friendly
 * message (e.g. once every key/model has been exhausted), so re-wrapping
 * would just lose that specificity.
 */
export function toFriendlyAIServiceError(
  error: unknown,
  friendlyMessage: string,
  status = 502
): AIServiceError {
  if (error instanceof AIServiceError) return error

  console.error(friendlyMessage, error)

  return new AIServiceError(friendlyMessage, status, error)
}
