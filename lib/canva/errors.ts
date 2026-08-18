/**
 * Errors from Phase 2's Canva usage (Design Import / Export — see
 * CANVA_NEXT_PHASE_PLAN.md), kept separate from `SocialAuthError`
 * (`lib/social/errors.ts`): that type's error codes are specifically about
 * the OAuth connect/callback round-trip (`cancelled`, `invalid_state`,
 * `exchange_failed`, ...), which doesn't fit "the design import job
 * failed" or "Canva isn't connected yet". Same discipline as
 * `SocialAuthError` — a stable `code` for callers to branch on, a `message`
 * for server-side logs only, never a raw Canva error body forwarded as-is.
 */
export type CanvaApiErrorCode =
  | "not_connected"
  | "reconnect_required"
  | "network_error"
  | "request_failed"
  | "timeout"
  | "invalid_response"

export class CanvaApiError extends Error {
  constructor(
    public readonly code: CanvaApiErrorCode,
    message: string
  ) {
    super(message);
    this.name = "CanvaApiError";
  }
}
