/**
 * Tokens + account data a provider hands back after a successful OAuth
 * connect — shaped to map directly onto ConnectedAccount's columns (see
 * prisma/schema.prisma). `platform` is deliberately not part of this shape;
 * the caller (the callback route) already knows which platform it's
 * handling and attaches it when writing to the DB.
 */
export type SocialConnectResult = {
  platformAccountId: string;
  accountName: string;
  accountUsername: string | null;
  profileImage: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
};

/** Just the display fields — what `getProfile` returns for an
 * already-connected account (e.g. to refresh stale display data without a
 * full reconnect). `connect` below is built on top of this. */
export type SocialProfile = {
  platformAccountId: string;
  accountName: string;
  accountUsername: string | null;
  profileImage: string | null;
};

export type SocialRefreshResult = {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
};

/**
 * One implementation per OAuth vendor, not per Platform card —
 * `lib/social/index.ts` maps each `Platform` enum value to the provider
 * instance that actually handles it (YOUTUBE → Google today). A vendor that
 * covers multiple cards (e.g. Meta for Instagram + Facebook) still only
 * needs one `SocialProvider` implementation, registered twice.
 *
 * Every method throws `SocialAuthError` (lib/social/errors.ts) on failure —
 * never a raw provider/SDK error — so callers (route handlers, server
 * actions) can always pattern-match on `error.code` without knowing
 * anything about the underlying vendor's error shapes.
 */
export interface SocialProvider {
  /**
   * Builds the vendor's OAuth consent-screen URL to redirect the user to.
   * `options.codeChallenge` is optional and only meaningful to a provider
   * whose flow requires PKCE (RFC 7636) — today, Canva
   * (`lib/social/providers/canva.ts`). Google/Meta ignore it; adding this
   * as an optional second parameter (rather than a new interface method)
   * keeps every existing provider's `getAuthorizationUrl(state)` signature
   * assignable as-is.
   */
  getAuthorizationUrl(state: string, options?: { codeChallenge?: string }): string;

  /**
   * Exchanges an authorization code (from the OAuth callback) for tokens
   * and the connected account's profile/channel data. `options.codeVerifier`
   * is the PKCE counterpart to `getAuthorizationUrl`'s `codeChallenge` —
   * same "optional, only Canva uses it today" reasoning.
   */
  connect(code: string, options?: { codeVerifier?: string }): Promise<SocialConnectResult>;

  /** Uses a stored refresh token to obtain a new access token. Not called
   * anywhere yet in this phase (no publishing/scheduling exists to need a
   * fresh token) — implemented now so that future work doesn't have to
   * touch this interface. */
  refresh(refreshToken: string): Promise<SocialRefreshResult>;

  /** Best-effort revoke of a stored token with the vendor. Must never
   * throw — disconnect has to succeed locally (delete the row) even if the
   * vendor call fails, e.g. because the token was already revoked. */
  disconnect(accessToken: string): Promise<void>;

  /** Re-fetches current profile/channel info for an already-connected
   * account. `connect` calls this internally right after exchanging the
   * code, so the two never duplicate profile-fetching logic. */
  getProfile(accessToken: string): Promise<SocialProfile>;
}
