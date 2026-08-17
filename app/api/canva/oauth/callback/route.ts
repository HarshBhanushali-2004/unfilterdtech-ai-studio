import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { canvaProvider } from "@/lib/social/providers/canva";
import { SocialAuthError } from "@/lib/social";
import { codeVerifierCookieName, stateCookieName, verifyOAuthState } from "@/lib/social/state";

export const runtime = "nodejs";

const PLATFORM = "canva";

/**
 * Second leg of Canva's OAuth flow — the counterpart to
 * `app/api/canva/connect/route.ts`. Mirrors
 * `app/api/social/[platform]/callback/route.ts`'s shape and UX conventions
 * (same query-param signaling, same upsert-by-platform, same
 * `ConnectionOAuthToast` handling on `/connections`) with the one real
 * addition PKCE requires: the `code_verifier` cookie has to be read back
 * out and handed to `canvaProvider.connect` alongside the authorization
 * `code`, or Canva's token endpoint rejects the exchange.
 *
 * The redirect URI Canva sends the browser back to here is whatever's
 * registered in the Canva Developer Portal for this integration — it must
 * match `CANVA_REDIRECT_URI` (used to build the authorization URL) exactly,
 * including in production (see the deployment note in
 * `lib/social/providers/canva.ts`).
 */
export async function GET(request: NextRequest) {
  const redirectWithError = (code: string) => {
    const url = new URL("/connections", request.url);
    url.searchParams.set("social_error", code);
    url.searchParams.set("platform", "CANVA");
    const response = NextResponse.redirect(url);
    response.cookies.delete(stateCookieName(PLATFORM));
    response.cookies.delete(codeVerifierCookieName(PLATFORM));
    return response;
  };

  // Canva sets `error=access_denied` when the user cancels on the consent
  // screen; anything else it might send is treated as unknown rather than
  // guessed at (mirrors the generic callback route's handling of Google).
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    return redirectWithError(oauthError === "access_denied" ? "cancelled" : "unknown");
  }

  const code = request.nextUrl.searchParams.get("code");
  const receivedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(stateCookieName(PLATFORM))?.value;
  const codeVerifier = request.cookies.get(codeVerifierCookieName(PLATFORM))?.value;

  // Covers a missing/expired state or verifier cookie, a mismatched state
  // (possible CSRF/replay), and someone hitting this URL directly without a
  // code — the "invalid redirect" case this leg can actually detect.
  if (!code || !codeVerifier || !verifyOAuthState(expectedState, receivedState)) {
    return redirectWithError("invalid_state");
  }

  let result;
  try {
    result = await canvaProvider.connect(code, { codeVerifier });
  } catch (error) {
    // Never let a raw Canva API error/body reach the browser — only the
    // stable SocialAuthError code, forwarded as a query param; the full
    // error (which may include vendor diagnostic text) is logged
    // server-side only.
    console.error("Canva OAuth connect failed", error);
    return redirectWithError(error instanceof SocialAuthError ? error.code : "unknown");
  }

  const accountData = {
    platformAccountId: result.platformAccountId,
    accountName: result.accountName,
    accountUsername: result.accountUsername,
    profileImage: result.profileImage,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    tokenExpiresAt: result.tokenExpiresAt,
    status: "CONNECTED" as const,
    connectedAt: new Date(),
  };

  // Same upsert-by-platform shape as the generic callback route and the
  // Phase 1 mock `connectPlatform` — one row per platform.
  const existing = await prisma.connectedAccount.findFirst({ where: { platform: "CANVA" } });

  if (existing) {
    await prisma.connectedAccount.update({ where: { id: existing.id }, data: accountData });
  } else {
    await prisma.connectedAccount.create({ data: { platform: "CANVA", ...accountData } });
  }

  const successUrl = new URL("/connections", request.url);
  successUrl.searchParams.set("social", "connected");
  successUrl.searchParams.set("platform", "CANVA");
  if (!result.refreshToken) {
    // Non-fatal — the account is connected and usable now, it just can't
    // be silently refreshed once the access token expires.
    successUrl.searchParams.set("warning", "no_refresh_token");
  }

  const response = NextResponse.redirect(successUrl);
  response.cookies.delete(stateCookieName(PLATFORM));
  response.cookies.delete(codeVerifierCookieName(PLATFORM));
  return response;
}
