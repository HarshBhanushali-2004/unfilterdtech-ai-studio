export type SocialAuthErrorCode =
  | "cancelled"
  | "invalid_state"
  | "exchange_failed"
  | "missing_channel"
  | "network_error"
  | "not_configured"
  | "unknown";

/**
 * Thrown by anything under lib/social/** — providers, and the
 * connect/callback route handlers that call them. `code` is a stable,
 * URL-safe identifier the callback route forwards as `?social_error=<code>`
 * on its redirect back to /connections; `ConnectionOAuthToast`
 * (components/connections/connection-oauth-toast.tsx) maps each code to a
 * friendly toast. The raw `message` is for server-side logs only — it is
 * never sent to the client (same discipline as `AIServiceError`, see
 * lib/ai/errors.ts).
 */
export class SocialAuthError extends Error {
  constructor(
    public readonly code: SocialAuthErrorCode,
    message: string
  ) {
    super(message);
    this.name = "SocialAuthError";
  }
}
