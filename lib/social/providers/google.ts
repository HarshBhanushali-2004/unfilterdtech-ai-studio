import { getOAuthRedirectUri } from "../app-url";
import { SocialAuthError } from "../errors";
import type {
  SocialConnectResult,
  SocialProfile,
  SocialProvider,
  SocialRefreshResult,
} from "../types";

/**
 * Google OAuth 2.0 + YouTube Data API v3, implemented with plain `fetch`
 * against Google's REST endpoints — no SDK. `google-auth-library` is present
 * in node_modules but only as a transitive dependency of `@google/genai`
 * (the Gemini SDK), not a declared project dependency; relying on it here
 * would be fragile (it can disappear on an unrelated `npm install`) and
 * pulls in far more than this needs. See CLAUDE.md "Avoid unnecessary
 * dependencies."
 *
 * This module still only *reads* the channel (`connect`/`getProfile`) — no
 * upload/publish call exists anywhere in the app yet. The requested scopes
 * do include upload access (see YOUTUBE_SCOPES below) so that a future
 * publishing feature doesn't force every already-connected account to
 * reconnect just to grant one more permission.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";

/**
 * `youtube.readonly` — read the connected channel's profile (id, title,
 * thumbnail); used today. `youtube.upload` — publish videos/Shorts; not
 * called anywhere yet, requested now for forward-compatibility (see above).
 * Deliberately two narrow scopes rather than the broad `youtube` (full
 * account management) scope — least privilege.
 */
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
].join(" ");

type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/**
 * Read at call time (not module load), matching the rest of the app's env
 * convention (see CLAUDE.md Section 14) — so a Vercel/env change takes
 * effect on the next request without a redeploy.
 *
 * The redirect URI is deliberately *derived* from `APP_URL` (see
 * lib/social/app-url.ts) rather than read from its own env var — a
 * hardcoded `GOOGLE_REDIRECT_URI` is exactly what pinned this flow to
 * `localhost` before (it doesn't follow the app when it's reached via a
 * LAN IP or a different deployment). Deriving it here also guarantees the
 * authorization step (`getAuthorizationUrl`) and the token-exchange step
 * (`connect`) always agree — Google rejects the exchange if the two don't
 * match exactly.
 */
function getGoogleConfig(): GoogleConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new SocialAuthError(
      "not_configured",
      "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set."
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri: getOAuthRedirectUri("/api/social/youtube/callback"),
  };
}

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

type YoutubeChannel = {
  id: string;
  snippet: {
    title: string;
    customUrl?: string;
    thumbnails?: { default?: { url?: string } };
  };
};

async function requestTokens(body: URLSearchParams): Promise<GoogleTokenResponse> {
  let response: Response;

  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (error) {
    throw new SocialAuthError(
      "network_error",
      `Failed to reach Google's token endpoint: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: string; error_description?: string }
      | null;

    // `invalid_grant` covers both an expired/already-used authorization
    // code and a revoked/expired refresh token — the two "expired code" /
    // "invalid redirect" replay cases this endpoint can actually see.
    if (errorBody?.error === "invalid_grant") {
      throw new SocialAuthError(
        "exchange_failed",
        `Google rejected the grant (invalid_grant): ${errorBody.error_description ?? "no description"}`
      );
    }

    throw new SocialAuthError(
      "exchange_failed",
      `Google token endpoint returned ${response.status}: ${errorBody?.error ?? "unknown error"}`
    );
  }

  return response.json();
}

async function fetchOwnChannel(accessToken: string): Promise<YoutubeChannel> {
  const url = new URL(CHANNELS_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");

  let response: Response;

  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    throw new SocialAuthError(
      "network_error",
      `Failed to reach the YouTube Data API: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!response.ok) {
    throw new SocialAuthError(
      "network_error",
      `YouTube Data API returned ${response.status} fetching the channel.`
    );
  }

  const data = (await response.json()) as { items?: YoutubeChannel[] };
  const channel = data.items?.[0];

  if (!channel) {
    // Not an error condition upstream — a perfectly valid Google account
    // can simply have no YouTube channel. Nothing gets persisted for this;
    // see the callback route.
    throw new SocialAuthError(
      "missing_channel",
      "Google account has no YouTube channel (channels.list?mine=true returned no items)."
    );
  }

  return channel;
}

function toSocialProfile(channel: YoutubeChannel): SocialProfile {
  return {
    platformAccountId: channel.id,
    accountName: channel.snippet.title,
    // Modern channel handles come back as "@name" already — strip the "@"
    // so it's stored bare, consistent with every other platform's
    // accountUsername, and the UI's own "@" prefix doesn't double up.
    accountUsername: channel.snippet.customUrl?.replace(/^@/, "") ?? null,
    profileImage: channel.snippet.thumbnails?.default?.url ?? null,
  };
}

function getAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleConfig();

  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPES);
  url.searchParams.set("access_type", "offline");
  // Forces Google to reissue a refresh_token on every connect. Without
  // this, a user who connected before (and already granted consent) would
  // silently get no refresh_token back on a second connect.
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return url.toString();
}

async function getProfile(accessToken: string): Promise<SocialProfile> {
  const channel = await fetchOwnChannel(accessToken);
  return toSocialProfile(channel);
}

async function connect(code: string): Promise<SocialConnectResult> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();

  const tokens = await requestTokens(
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    })
  );

  // Throws `missing_channel` here if this Google account has no YouTube
  // channel — nothing gets persisted in that case (see callback route).
  const profile = await getProfile(tokens.access_token);

  return {
    ...profile,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    tokenExpiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null,
  };
}

async function refresh(refreshToken: string): Promise<SocialRefreshResult> {
  const { clientId, clientSecret } = getGoogleConfig();

  const tokens = await requestTokens(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    })
  );

  return {
    accessToken: tokens.access_token,
    // Google does not normally reissue a refresh_token on a refresh call —
    // keep the one we already have.
    refreshToken: tokens.refresh_token ?? refreshToken,
    tokenExpiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null,
  };
}

async function disconnect(accessToken: string): Promise<void> {
  try {
    const url = new URL(REVOKE_URL);
    url.searchParams.set("token", accessToken);
    await fetch(url, { method: "POST" });
  } catch (error) {
    // Best-effort — the caller (disconnectPlatform) always deletes the
    // local row regardless of whether this succeeds.
    console.error("Failed to revoke Google token", error);
  }
}

export const googleProvider: SocialProvider = {
  getAuthorizationUrl,
  connect,
  refresh,
  disconnect,
  getProfile,
};
