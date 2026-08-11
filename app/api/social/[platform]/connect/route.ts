import { NextResponse, type NextRequest } from "next/server";

import { PlatformSchema } from "@/lib/connections/schema";
import { getSocialProvider, SocialAuthError } from "@/lib/social";
import { generateOAuthState, stateCookieName } from "@/lib/social/state";

// Reaches out to Google (indirectly, via the provider) and uses Node's
// crypto module for the state cookie — needs the Node runtime, matching
// every other route in this app that calls an external SDK/API (CLAUDE.md
// Section 20).
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

/**
 * First leg of the OAuth flow: the "Connect" button navigates the browser
 * here (a real redirect, not a fetch — Google needs to own the next hop).
 * Builds the vendor's authorization URL and 302s the browser to it, with a
 * short-lived CSRF `state` cookie so the callback route can verify this
 * exact browser initiated the request it's completing.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { platform: rawPlatform } = await params;

  const redirectToConnectionsWithError = (code: string, platform?: string) => {
    const url = new URL("/connections", request.url);
    url.searchParams.set("social_error", code);
    if (platform) url.searchParams.set("platform", platform);
    return NextResponse.redirect(url);
  };

  const parsedPlatform = PlatformSchema.safeParse(rawPlatform.toUpperCase());

  if (!parsedPlatform.success) {
    return redirectToConnectionsWithError("unknown");
  }

  const platform = parsedPlatform.data;
  const provider = getSocialProvider(platform);

  if (!provider) {
    // Platform card exists but has no real provider yet (Phase 2B/2C) —
    // the UI shouldn't ever send a request here for those (ConnectionCard
    // only redirects for OAUTH_ENABLED_PLATFORMS), but guard anyway.
    return redirectToConnectionsWithError("not_configured", platform);
  }

  try {
    const state = generateOAuthState();
    const authorizationUrl = provider.getAuthorizationUrl(state);

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set({
      name: stateCookieName(platform),
      value: state,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300, // 5 minutes — just long enough to get through the consent screen
    });

    return response;
  } catch (error) {
    console.error(`Failed to start ${platform} OAuth flow`, error);
    const code = error instanceof SocialAuthError ? error.code : "unknown";
    return redirectToConnectionsWithError(code, platform);
  }
}
