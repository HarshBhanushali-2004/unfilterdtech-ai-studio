import { randomBytes, timingSafeEqual } from "node:crypto";

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
