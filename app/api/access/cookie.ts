import crypto from "node:crypto"

/**
 * Shared signing/verification helpers for the private beta password gate.
 *
 * Isolated on purpose: everything the gate needs lives under app/access,
 * app/api/access, app/api/logout, and proxy.ts. Deleting those four paths
 * (and the SITE_PASSWORD/COOKIE_SECRET env vars) removes the gate entirely.
 */

export const ACCESS_COOKIE_NAME = "studio_auth"
export const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

function getCookieSecret(): string {
  const secret = process.env.COOKIE_SECRET
  if (!secret) {
    throw new Error("COOKIE_SECRET is not configured")
  }
  return secret
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getCookieSecret()).update(payload).digest("hex")
}

/** Builds a `<issuedAt>.<hmac-signature>` value. The timestamp is part of the
 * signed payload, so it can't be forged or extended without knowing the secret. */
export function createAccessCookieValue(): string {
  const issuedAt = Date.now().toString()
  return `${issuedAt}.${sign(issuedAt)}`
}

/** Verifies signature and expiry. Never throws — a misconfigured or tampered
 * cookie just fails closed (treated as unauthenticated). */
export function verifyAccessCookie(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false

  const [issuedAt, signature] = cookieValue.split(".")
  if (!issuedAt || !signature) return false

  try {
    const expectedSignature = sign(issuedAt)

    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (signatureBuffer.length !== expectedBuffer.length) return false
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return false
  } catch {
    // COOKIE_SECRET missing/misconfigured, or malformed input — fail closed.
    return false
  }

  const issuedAtMs = Number(issuedAt)
  if (!Number.isFinite(issuedAtMs)) return false

  const ageMs = Date.now() - issuedAtMs
  if (ageMs < 0 || ageMs > ACCESS_COOKIE_MAX_AGE_SECONDS * 1000) return false

  return true
}

/** Constant-time string comparison for the submitted password vs. SITE_PASSWORD. */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  if (aBuffer.length !== bBuffer.length) return false
  return crypto.timingSafeEqual(aBuffer, bBuffer)
}
