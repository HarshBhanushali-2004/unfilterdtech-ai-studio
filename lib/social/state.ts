import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * CSRF protection for the OAuth redirect round-trip (the "state" param).
 * One cookie per platform, so a connect attempt started for one platform in
 * one tab can't be confused with another started elsewhere. Route handlers
 * own the actual cookie I/O (`request.cookies` / `response.cookies`) — this
 * file only generates/verifies the value, matching the split already used
 * for the private-beta gate (app/api/access/cookie.ts).
 */

export function stateCookieName(platform: string): string {
  return `social_oauth_state_${platform.toLowerCase()}`;
}

export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

/** Constant-time comparison. The state value itself (HttpOnly, single-use,
 * 5-minute lifetime) is the actual security control — timing-safety here
 * just costs nothing and removes any doubt. */
export function verifyOAuthState(
  expected: string | undefined,
  received: string | null
): boolean {
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * PKCE (RFC 7636) support — additive to the CSRF `state` helpers above, for
 * providers whose OAuth flow requires Proof Key for Code Exchange (today:
 * Canva, see `lib/social/providers/canva.ts`). Google/Meta don't use these
 * and are unaffected. Kept in this file rather than a separate module
 * because PKCE is the same category of concern as `state` — a short-lived,
 * HttpOnly-cookie-carried secret that defeats a class of OAuth redirect
 * attacks — not because every provider needs it.
 */

export function codeVerifierCookieName(platform: string): string {
  return `social_oauth_pkce_${platform.toLowerCase()}`;
}

/** A `code_verifier` per RFC 7636 §4.1: 32 random bytes, base64url-encoded
 * (43 characters, no padding) — comfortably inside the spec's required
 * 43-128 character range, drawn only from its unreserved-character alphabet. */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** The S256 `code_challenge` per RFC 7636 §4.2: BASE64URL(SHA256(code_verifier)). */
export function generateCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}
