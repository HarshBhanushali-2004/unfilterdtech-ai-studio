import { getOAuthRedirectUri } from "../app-url";
import { SocialAuthError } from "../errors";
import type {
  SocialConnectResult,
  SocialProfile,
  SocialProvider,
  SocialRefreshResult,
} from "../types";

/**
 * Meta (Facebook Pages + Instagram professional accounts) OAuth 2.0 +
 * Graph API, implemented with plain `fetch` — no SDK, matching
 * `lib/social/providers/google.ts`'s own reasoning (see that file's doc
 * comment) — same "don't pull in a dependency this doesn't need" logic
 * applies to `facebook-nodejs-business-sdk`.
 *
 * One Meta App (with the Facebook Login for Business + Instagram Graph API
 * products enabled) backs BOTH the FACEBOOK and INSTAGRAM platform cards —
 * Meta has no separate "Instagram OAuth". Instagram professional-account
 * publishing goes through the Facebook Graph API, authenticated with the
 * access token of the Facebook Page the Instagram account is linked to.
 * That's why `facebookProvider` and `instagramProvider` below share every
 * step up through "list the Pages this user manages"
 * (`resolveManagedPages`) and only diverge at the end — a Page itself, vs.
 * that Page's linked Instagram professional (business/creator) account
 * (`resolveInstagramAccount`). A personal (non-professional) Instagram
 * account has no Graph API access at all and will correctly surface as
 * `missing_instagram_account` here, never silently "connect".
 *
 * AUTHORIZATION FLOW: this app's Meta App product is **Facebook Login for
 * Business**, not classic "Facebook Login". Business Login apps do not
 * accept a freeform `scope` parameter on `/dialog/oauth` for business-asset
 * permissions (`pages_show_list`, `pages_manage_posts`, `instagram_basic`,
 * `instagram_content_publish`, etc.) — passing one gets rejected by Meta as
 * "Invalid Scopes". Instead, the permissions + asset-linking step are
 * bundled server-side into a **Login Configuration** you create once in
 * Meta Dashboard > Facebook Login > Configurations, referenced here by its
 * `config_id` (`META_LOGIN_CONFIG_ID`, read via `getMetaConfig()`). See
 * `REQUIRED_META_PERMISSIONS` below for exactly what that Configuration
 * needs to include.
 *
 * KNOWN SIMPLIFICATION: a user who manages more than one Facebook Page
 * gets the *first* Page `/me/accounts` returns, for both cards — there's
 * no in-app Page picker (adding one is a UI change, out of scope for this
 * task). Reconnecting doesn't currently let you choose a different Page.
 */

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION?.trim() || "v21.0"; // bump as Meta deprecates older versions
const AUTH_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * NOT sent as a `scope` URL param (see the module doc comment above) — this
 * is purely documentation of what the Meta Dashboard Login Configuration
 * (`META_LOGIN_CONFIG_ID`) must grant, and is echoed in the `not_configured`
 * error below so a misconfigured Configuration is easy to diagnose.
 *
 * `pages_show_list` / `pages_read_engagement` — discover and read the
 * Pages this user manages (needed for both cards). `pages_manage_posts` —
 * publish to a Facebook Page; not called anywhere yet (no publish feature
 * exists), requested now for the same forward-compatibility reason as
 * YouTube's `youtube.upload` scope (see google.ts). `instagram_basic` /
 * `instagram_content_publish` — read + publish to the Page's linked
 * Instagram professional account. Each still needs Meta App Review
 * (Advanced Access) before anyone other than the app's own
 * admins/developers/testers can grant it — see the setup notes.
 */
const REQUIRED_META_PERMISSIONS = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
];

type MetaConfig = { clientId: string; clientSecret: string; loginConfigId: string };

/** Read at call time (not module load), matching the rest of the app's env
 * convention (see CLAUDE.md Section 14) — so a Vercel/env change takes
 * effect on the next request without a redeploy. Shared by both providers
 * below: Facebook and Instagram are the same Meta App and the same Login
 * Configuration (it grants both Page and Instagram permissions together —
 * see the module doc comment). */
function getMetaConfig(): MetaConfig {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  const loginConfigId = process.env.META_LOGIN_CONFIG_ID;

  if (!clientId || !clientSecret || !loginConfigId) {
    throw new SocialAuthError(
      "not_configured",
      "META_APP_ID, META_APP_SECRET, or META_LOGIN_CONFIG_ID is not set. " +
        "META_LOGIN_CONFIG_ID must point at a Meta Dashboard > Facebook Login > " +
        `Configurations entry that grants: ${REQUIRED_META_PERMISSIONS.join(", ")}.`
    );
  }

  return { clientId, clientSecret, loginConfigId };
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new SocialAuthError(
      "network_error",
      `Failed to reach the Graph API (${path}): ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (body as { error?: { message?: string } } | null)?.error?.message;
    throw new SocialAuthError(
      "exchange_failed",
      `Graph API ${path} returned ${response.status}: ${message ?? "unknown error"}`
    );
  }

  return body as T;
}

type MetaPage = {
  id: string;
  name: string;
  username?: string;
  access_token: string;
  picture?: { data?: { url?: string } };
};

/**
 * Shared authorization-code exchange used by both providers: code ->
 * short-lived user token -> long-lived (~60 day) user token -> the Pages
 * this user manages, each already carrying its own Page access token
 * (long-lived, because the request that fetched them used the long-lived
 * user token — see Meta's docs on `/me/accounts`). Page access tokens
 * derived this way are documented as non-expiring under normal conditions
 * (no password change / no revoke on Meta's side), so nothing downstream
 * of this needs a `tokenExpiresAt`.
 */
async function resolveManagedPages(code: string, redirectUri: string): Promise<MetaPage[]> {
  const { clientId, clientSecret } = getMetaConfig();

  const shortLived = await graphGet<{ access_token: string }>("/oauth/access_token", {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const longLived = await graphGet<{ access_token: string }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: shortLived.access_token,
  });

  const pages = await graphGet<{ data: MetaPage[] }>("/me/accounts", {
    fields: "id,name,username,access_token,picture",
    access_token: longLived.access_token,
  });

  if (pages.data.length === 0) {
    throw new SocialAuthError(
      "missing_page",
      "This Facebook account doesn't manage any Facebook Pages (pages_show_list returned none)."
    );
  }

  return pages.data;
}

// ---- Facebook ----

function getFacebookAuthorizationUrl(state: string): string {
  const { clientId, loginConfigId } = getMetaConfig();

  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getOAuthRedirectUri("/api/social/facebook/callback"));
  url.searchParams.set("response_type", "code");
  // Facebook Login for Business: permissions come from the Login
  // Configuration (config_id), not a `scope` param — see the module doc
  // comment. Passing `scope` here alongside `config_id` is what Meta was
  // rejecting as "Invalid Scopes".
  url.searchParams.set("config_id", loginConfigId);
  url.searchParams.set("state", state);

  return url.toString();
}

async function facebookGetProfile(accessToken: string): Promise<SocialProfile> {
  // `/me` called with a Page access token resolves to the Page itself —
  // documented Graph API behavior, not a guess.
  const page = await graphGet<MetaPage>("/me", {
    fields: "id,name,username,picture",
    access_token: accessToken,
  });

  return {
    platformAccountId: page.id,
    accountName: page.name,
    accountUsername: page.username ?? null,
    profileImage: page.picture?.data?.url ?? null,
  };
}

async function facebookConnect(code: string): Promise<SocialConnectResult> {
  const pages = await resolveManagedPages(code, getOAuthRedirectUri("/api/social/facebook/callback"));
  const page = pages[0];
  const profile = await facebookGetProfile(page.access_token);

  return {
    ...profile,
    accessToken: page.access_token,
    // See the module doc comment — Meta doesn't hand out a classic refresh
    // token, and this Page token is documented as non-expiring under
    // normal conditions.
    refreshToken: null,
    tokenExpiresAt: null,
  };
}

async function facebookRefresh(): Promise<SocialRefreshResult> {
  // Nothing to refresh against — see the module doc comment. This should
  // be effectively unreachable in practice (`tokenExpiresAt` is always
  // null for this provider, so `ensureFreshAccessToken` never calls it),
  // but if it ever is, fail loudly rather than pretend to succeed: the fix
  // for an invalidated Page token is reconnecting, not refreshing.
  throw new SocialAuthError(
    "exchange_failed",
    "Facebook Page access tokens do not support silent refresh; reconnect this account."
  );
}

async function facebookDisconnect(accessToken: string): Promise<void> {
  try {
    const url = new URL(`${GRAPH_URL}/me/permissions`);
    url.searchParams.set("access_token", accessToken);
    await fetch(url, { method: "DELETE" });
  } catch (error) {
    // Best-effort — the caller (disconnectPlatform) always deletes the
    // local row regardless of whether this succeeds.
    console.error("Failed to revoke Facebook token", error);
  }
}

export const facebookProvider: SocialProvider = {
  getAuthorizationUrl: getFacebookAuthorizationUrl,
  connect: facebookConnect,
  refresh: facebookRefresh,
  disconnect: facebookDisconnect,
  getProfile: facebookGetProfile,
};

// ---- Instagram ----

type InstagramBusinessAccount = {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
};

function getInstagramAuthorizationUrl(state: string): string {
  const { clientId, loginConfigId } = getMetaConfig();

  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getOAuthRedirectUri("/api/social/instagram/callback"));
  url.searchParams.set("response_type", "code");
  // Same Login Configuration as Facebook — see getFacebookAuthorizationUrl
  // and the module doc comment.
  url.searchParams.set("config_id", loginConfigId);
  url.searchParams.set("state", state);

  return url.toString();
}

/**
 * Resolves the Instagram professional (business/creator) account linked to
 * a Facebook Page. Throws `missing_instagram_account` — never falls back
 * to treating the Page itself as "the Instagram account" — if the Page has
 * no linked professional account (e.g. it's linked to a personal Instagram
 * account, or nothing at all). This is the check that keeps this flow from
 * ever assuming a personal Instagram account can use the publishing APIs.
 */
async function resolveInstagramAccount(page: {
  id: string;
  name: string;
  access_token: string;
}): Promise<InstagramBusinessAccount> {
  const linked = await graphGet<{ instagram_business_account?: { id: string } }>(`/${page.id}`, {
    fields: "instagram_business_account",
    access_token: page.access_token,
  });

  const igAccountId = linked.instagram_business_account?.id;

  if (!igAccountId) {
    throw new SocialAuthError(
      "missing_instagram_account",
      `Facebook Page "${page.name}" has no linked Instagram professional (business/creator) account.`
    );
  }

  return graphGet<InstagramBusinessAccount>(`/${igAccountId}`, {
    fields: "id,username,name,profile_picture_url",
    access_token: page.access_token,
  });
}

async function instagramGetProfile(accessToken: string): Promise<SocialProfile> {
  // `accessToken` here is the Page access token stored on connect (see
  // instagramConnect) — Instagram Graph API calls are authenticated with
  // the linked Page's token, there's no separate Instagram-specific one.
  const page = await graphGet<{ id: string; name: string }>("/me", {
    fields: "id,name",
    access_token: accessToken,
  });
  const account = await resolveInstagramAccount({ ...page, access_token: accessToken });

  return {
    platformAccountId: account.id,
    accountName: account.name ?? account.username ?? page.name,
    accountUsername: account.username ?? null,
    profileImage: account.profile_picture_url ?? null,
  };
}

async function instagramConnect(code: string): Promise<SocialConnectResult> {
  const pages = await resolveManagedPages(code, getOAuthRedirectUri("/api/social/instagram/callback"));
  const page = pages[0];
  const profile = await instagramGetProfile(page.access_token);

  return {
    ...profile,
    accessToken: page.access_token,
    refreshToken: null,
    tokenExpiresAt: null,
  };
}

async function instagramRefresh(): Promise<SocialRefreshResult> {
  throw new SocialAuthError(
    "exchange_failed",
    "Instagram (via its linked Facebook Page) does not support silent refresh; reconnect this account."
  );
}

async function instagramDisconnect(accessToken: string): Promise<void> {
  try {
    const url = new URL(`${GRAPH_URL}/me/permissions`);
    url.searchParams.set("access_token", accessToken);
    await fetch(url, { method: "DELETE" });
  } catch (error) {
    console.error("Failed to revoke Instagram (Facebook Page) token", error);
  }
}

export const instagramProvider: SocialProvider = {
  getAuthorizationUrl: getInstagramAuthorizationUrl,
  connect: instagramConnect,
  refresh: instagramRefresh,
  disconnect: instagramDisconnect,
  getProfile: instagramGetProfile,
};
