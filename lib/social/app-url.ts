import { SocialAuthError } from "./errors";

/**
 * Single source of truth for this app's own public base URL — used to
 * build OAuth redirect URIs consistently across the authorization-URL step
 * and the token-exchange step (they must match exactly, or the vendor
 * rejects the exchange).
 *
 * Never hardcode `localhost` or a LAN IP anywhere else in the OAuth code
 * path; everything that needs "this app's origin" reads it from here.
 *
 * - Local dev (same machine): leave `APP_URL` unset — defaults to
 *   `http://localhost:3000`, matching the previous hardcoded behavior.
 * - LAN/mobile dev (phone on the same network): set `APP_URL` in
 *   `.env.local` to a stable tunnel URL, never a raw `192.168.x.x`
 *   address — DHCP can reassign that at any time, and a Google-authorized
 *   redirect URI that no longer matches fails closed. See CLAUDE.md /
 *   the OAuth setup notes for the recommended tunnel approach.
 * - Production (Vercel): set `APP_URL` to the permanent HTTPS domain.
 *   There is no implicit default in production — a missing `APP_URL`
 *   fails closed with a clear config error instead of silently building a
 *   redirect URI against the wrong host.
 */
export function getAppUrl(): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new SocialAuthError(
    "not_configured",
    "APP_URL is not set. Production requires an explicit APP_URL (the permanent HTTPS domain) — there is no safe default."
  );
}

/** Joins `getAppUrl()` with a path, e.g. `getOAuthRedirectUri("/api/social/youtube/callback")`. */
export function getOAuthRedirectUri(path: string): string {
  return `${getAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
