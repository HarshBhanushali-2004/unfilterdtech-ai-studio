import { NextResponse, type NextRequest } from "next/server";

import { canvaProvider } from "@/lib/social/providers/canva";
import { SocialAuthError } from "@/lib/social";
import {
  codeVerifierCookieName,
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
  stateCookieName,
} from "@/lib/social/state";

// Generates the PKCE verifier/challenge and the CSRF state via Node's
// crypto module — needs the Node runtime, matching every other OAuth route
// in this app (CLAUDE.md Section 20).
export const runtime = "nodejs";

const PLATFORM = "canva";

function redirectToConnectionsWithError(request: NextRequest, code: string) {
  const url = new URL("/connections", request.url);
  url.searchParams.set("social_error", code);
  url.searchParams.set("platform", "CANVA");
  return NextResponse.redirect(url);
}

/**
 * First leg of Canva's OAuth flow — its own dedicated route rather than the
 * generic `app/api/social/[platform]/connect/route.ts`, because Canva's
 * authorization flow requires PKCE (S256): a `code_verifier` has to be
 * generated here and its `code_challenge` sent on the authorization URL,
 * then the verifier itself has to survive until the callback to complete
 * the token exchange. See `lib/social/providers/canva.ts`'s doc comment for
 * why this doesn't fit the generic route, and `lib/social/state.ts` for the
 * PKCE helpers shared with any future provider that needs them.
 *
 * Same short-lived, HttpOnly, CSRF-`state` cookie pattern as the generic
 * connect route, plus a second cookie for the PKCE verifier — both 5
 * minutes, just long enough to get through Canva's consent screen.
 */
export async function GET(request: NextRequest) {
  try {
    const state = generateOAuthState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const authorizationUrl = canvaProvider.getAuthorizationUrl(state, { codeChallenge });

    const response = NextResponse.redirect(authorizationUrl);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 300, // 5 minutes — just long enough to get through Canva's consent screen
    };

    response.cookies.set({ name: stateCookieName(PLATFORM), value: state, ...cookieOptions });
    response.cookies.set({
      name: codeVerifierCookieName(PLATFORM),
      value: codeVerifier,
      ...cookieOptions,
    });

    return response;
  } catch (error) {
    console.error("Failed to start Canva OAuth flow", error);
    const code = error instanceof SocialAuthError ? error.code : "unknown";
    return redirectToConnectionsWithError(request, code);
  }
}
