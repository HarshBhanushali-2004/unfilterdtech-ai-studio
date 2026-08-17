import { SocialAuthError } from "../errors";
import type {
  SocialConnectResult,
  SocialProfile,
  SocialProvider,
  SocialRefreshResult,
} from "../types";

/**
 * Canva Connect API OAuth 2.0, implemented with plain `fetch` — no SDK,
 * matching `providers/google.ts`/`providers/meta.ts`'s own reasoning.
 *
 * The one real difference from every other provider in this file: Canva's
 * authorization flow *requires* PKCE (RFC 7636, S256) — `getAuthorizationUrl`
 * needs a `code_challenge` and `connect` needs the matching `code_verifier`,
 * both threaded through via `SocialProvider`'s optional `options` params
 * (see `lib/social/types.ts`). Because of that, Canva does **not** go
 * through the generic `app/api/social/[platform]/{connect,callback}`
 * routes — it has its own `app/api/canva/connect` and
 * `app/api/canva/oauth/callback` routes that own generating/storing the
 * verifier and challenge (`lib/social/state.ts`'s PKCE helpers). This
 * module still implements the full `SocialProvider` interface so
 * `lib/connections/token-refresh.ts` (refresh-on-read) and
 * `disconnectPlatform` (`lib/connections/actions.ts`) work for Canva
 * exactly the same way they already do for YouTube/Facebook/Instagram —
 * only the *connect* leg is Canva-specific, not the whole lifecycle.
 *
 * SCOPES: deliberately hardcoded to exactly what the "UnfilteredTech AI"
 * Canva integration was granted in the Developer Portal — asset read/write,
 * brandtemplate:content/meta read, design:content read/write, design:meta
 * read, profile read. Never add a scope here without adding it in the
 * Developer Portal first; Canva rejects an authorization request for a
 * scope the integration doesn't hold.
 *
 * PROFILE DATA IS DELIBERATELY MINIMAL: Canva's Connect API exposes no
 * username and no avatar/profile-picture URL today (`/v1/users/me/profile`
 * currently returns only `display_name`; Canva's own docs note "more user
 * information is expected to be included in the future"). Rather than
 * fabricate a username or avatar, `accountUsername`/`profileImage` are
 * always `null` for Canva — matching this app's "don't fake a feature that
 * doesn't exist" discipline (see AGENTS.md).
 */

const AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const REVOKE_URL = "https://api.canva.com/rest/v1/oauth/revoke";
const ME_URL = "https://api.canva.com/rest/v1/users/me";
const PROFILE_URL = "https://api.canva.com/rest/v1/users/me/profile";

/** Exactly the scopes granted to the integration — see the module doc comment. */
const SCOPES = [
  "asset:read",
  "asset:write",
  "brandtemplate:content:read",
  "brandtemplate:meta:read",
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "profile:read",
].join(" ");

type CanvaConfig = { clientId: string; clientSecret: string; redirectUri: string };

/**
 * Read at call time (not module load), matching this app's env convention
 * (CLAUDE.md Section 14) — a Vercel/env change takes effect on the next
 * request without a redeploy. Unlike Google/Meta, the redirect URI is its
 * own explicit env var (`CANVA_REDIRECT_URI`) rather than derived from
 * `APP_URL` — Canva requires the redirect URI registered in the Developer
 * Portal to match byte-for-byte, so an explicit, deliberately-set value is
 * safer than one derived from another env var that could drift.
 */
function getCanvaConfig(): CanvaConfig {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  const redirectUri = process.env.CANVA_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new SocialAuthError(
      "not_configured",
      "CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, or CANVA_REDIRECT_URI is not set."
    );
  }

  return { clientId, clientSecret, redirectUri };
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

type CanvaTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

/** Shared by the authorization-code and refresh-token grants — both are
 * `POST /v1/oauth/token` with HTTP Basic auth (client_id:client_secret),
 * differing only in the form body. */
async function requestToken(body: URLSearchParams): Promise<CanvaTokenResponse> {
  const { clientId, clientSecret } = getCanvaConfig();

  let response: Response;

  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(clientId, clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch (error) {
    throw new SocialAuthError(
      "network_error",
      `Failed to reach Canva's token endpoint: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: string; error_description?: string }
      | null;

    if (errorBody?.error === "invalid_grant") {
      throw new SocialAuthError(
        "exchange_failed",
        `Canva rejected the grant (invalid_grant): ${errorBody.error_description ?? "no description"}`
      );
    }

    throw new SocialAuthError(
      "exchange_failed",
      `Canva token endpoint returned ${response.status}: ${errorBody?.error ?? "unknown error"}`
    );
  }

  return response.json();
}

async function canvaGet<T>(url: string, accessToken: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch (error) {
    throw new SocialAuthError(
      "network_error",
      `Failed to reach the Canva API (${url}): ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!response.ok) {
    throw new SocialAuthError("network_error", `Canva API ${url} returned ${response.status}.`);
  }

  return response.json();
}

type CanvaMeResponse = { team_user: { user_id: string; team_id: string } };
type CanvaProfileResponse = { profile: { display_name?: string } };

function getAuthorizationUrl(state: string, options?: { codeChallenge?: string }): string {
  const { clientId, redirectUri } = getCanvaConfig();

  if (!options?.codeChallenge) {
    // Should never happen in practice — the dedicated `/api/canva/connect`
    // route always generates and passes one — but failing loudly here is
    // cheaper than silently building a non-PKCE authorization URL Canva
    // would reject anyway.
    throw new SocialAuthError(
      "not_configured",
      "Canva's authorization flow requires a PKCE code_challenge, none was provided."
    );
  }

  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", options.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

/** `GET /v1/users/me` (the account's stable id) + `GET /v1/users/me/profile`
 * (its display name) — two calls because Canva splits identity from
 * display data across these endpoints; see the module doc comment for why
 * username/avatar are left null. */
async function getProfile(accessToken: string): Promise<SocialProfile> {
  const [me, profile] = await Promise.all([
    canvaGet<CanvaMeResponse>(ME_URL, accessToken),
    canvaGet<CanvaProfileResponse>(PROFILE_URL, accessToken),
  ]);

  return {
    platformAccountId: me.team_user.user_id,
    accountName: profile.profile.display_name ?? "Canva account",
    accountUsername: null,
    profileImage: null,
  };
}

async function connect(code: string, options?: { codeVerifier?: string }): Promise<SocialConnectResult> {
  if (!options?.codeVerifier) {
    throw new SocialAuthError(
      "exchange_failed",
      "Missing PKCE code_verifier for the Canva token exchange."
    );
  }

  const { redirectUri } = getCanvaConfig();

  const tokens = await requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: options.codeVerifier,
      redirect_uri: redirectUri,
    })
  );

  const profile = await getProfile(tokens.access_token);

  return {
    ...profile,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
  };
}

async function refresh(refreshToken: string): Promise<SocialRefreshResult> {
  const tokens = await requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );

  return {
    accessToken: tokens.access_token,
    // Canva's refresh tokens are single-use/rotating — if the response
    // didn't include a new one for some reason, keep the existing one
    // rather than dropping it (mirrors google.ts's fallback and
    // `ensureFreshAccessToken`'s own `refreshed.refreshToken ?? account.refreshToken`).
    refreshToken: tokens.refresh_token ?? refreshToken,
    tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
  };
}

/** `POST /v1/oauth/revoke` — revoking a refresh token also invalidates its
 * whole lineage (including the current access token) and the user's
 * consent, so revoking just the refresh token (when we have one) is
 * sufficient; falls back to revoking the access token otherwise. Best-effort
 * like every other provider's `disconnect` — `disconnectPlatform` always
 * deletes the local row regardless of whether this succeeds. */
async function disconnect(accessToken: string): Promise<void> {
  try {
    const { clientId, clientSecret } = getCanvaConfig();

    await fetch(REVOKE_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(clientId, clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token: accessToken }),
    });
  } catch (error) {
    console.error("Failed to revoke Canva token", error);
  }
}

export const canvaProvider: SocialProvider = {
  getAuthorizationUrl,
  connect,
  refresh,
  disconnect,
  getProfile,
};
