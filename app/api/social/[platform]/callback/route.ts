import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { PlatformSchema } from "@/lib/connections/schema";
import { getSocialProvider, SocialAuthError } from "@/lib/social";
import { stateCookieName, verifyOAuthState } from "@/lib/social/state";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

/**
 * Second leg of the OAuth flow: the vendor redirects the browser here with
 * either `?code=...&state=...` (success) or `?error=...` (user cancelled,
 * or the vendor rejected the request). Exchanges the code for tokens,
 * fetches the connected profile, upserts ConnectedAccount, then redirects
 * back to /connections — which re-fetches fresh from the DB on that new
 * page load, so the page "updates automatically" with no client-side
 * plumbing needed. Every outcome (success, each error case) is signaled via
 * query params on that redirect; `ConnectionOAuthToast` on the page reads
 * them once and shows the matching toast.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { platform: rawPlatform } = await params;
  const parsedPlatform = PlatformSchema.safeParse(rawPlatform.toUpperCase());

  if (!parsedPlatform.success) {
    const url = new URL("/connections", request.url);
    url.searchParams.set("social_error", "unknown");
    return NextResponse.redirect(url);
  }

  const platform = parsedPlatform.data;

  const redirectWithError = (code: string) => {
    const url = new URL("/connections", request.url);
    url.searchParams.set("social_error", code);
    url.searchParams.set("platform", platform);
    const response = NextResponse.redirect(url);
    response.cookies.delete(stateCookieName(platform));
    return response;
  };

  // Google sets `error=access_denied` when the user cancels on the consent
  // screen; anything else it might send is treated as unknown rather than
  // guessed at.
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    return redirectWithError(oauthError === "access_denied" ? "cancelled" : "unknown");
  }

  const code = request.nextUrl.searchParams.get("code");
  const receivedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(stateCookieName(platform))?.value;

  // Covers a missing/expired state cookie, a mismatched state (possible
  // CSRF/replay), and someone hitting this URL directly without a code —
  // the "invalid redirect" case this leg can actually detect.
  if (!code || !verifyOAuthState(expectedState, receivedState)) {
    return redirectWithError("invalid_state");
  }

  const provider = getSocialProvider(platform);
  if (!provider) {
    return redirectWithError("not_configured");
  }

  let result;
  try {
    result = await provider.connect(code);
  } catch (error) {
    console.error(`${platform} OAuth connect failed`, error);
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
    // A real (re)connect, as opposed to the silent background refresh in
    // lib/connections/token-refresh.ts — see the `connectedAt` doc comment
    // in prisma/schema.prisma for why this is tracked separately from
    // updatedAt.
    connectedAt: new Date(),
  };

  // Same upsert-by-platform shape as the Phase 1 mock `connectPlatform` —
  // one row per platform today, see prisma/schema.prisma.
  const existing = await prisma.connectedAccount.findFirst({ where: { platform } });

  if (existing) {
    await prisma.connectedAccount.update({ where: { id: existing.id }, data: accountData });
  } else {
    await prisma.connectedAccount.create({ data: { platform, ...accountData } });
  }

  const successUrl = new URL("/connections", request.url);
  successUrl.searchParams.set("social", "connected");
  successUrl.searchParams.set("platform", platform);
  if (!result.refreshToken) {
    // Non-fatal — the account is connected and usable now, it just can't
    // be silently refreshed once the access token expires.
    successUrl.searchParams.set("warning", "no_refresh_token");
  }

  const response = NextResponse.redirect(successUrl);
  response.cookies.delete(stateCookieName(platform));
  return response;
}
