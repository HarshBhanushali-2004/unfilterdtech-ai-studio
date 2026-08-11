import type { ConnectedAccount } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSocialProvider } from "@/lib/social";

/** Refresh a token this far ahead of its real expiry, so a request that's
 * in flight when the token would otherwise lapse doesn't fail mid-call. */
const REFRESH_BUFFER_MS = 60_000;

/**
 * Lazy ("refresh on read") token refresh — there's no cron/background job
 * in this app (see CLAUDE.md Known Technical Debt), so this runs inline
 * wherever a ConnectedAccount is about to be read or used: today that's
 * `getConnections()`. Cheap when nothing needs refreshing (one Date
 * comparison, no network call); only reaches out to the provider when the
 * stored token is actually near/past `tokenExpiresAt`.
 *
 * Mock-connected platforms (no real provider, no `tokenExpiresAt`) pass
 * through unchanged — there's nothing for this to do for them.
 */
export async function ensureFreshAccessToken(
  account: ConnectedAccount
): Promise<ConnectedAccount> {
  if (account.status !== "CONNECTED") return account;
  if (!account.tokenExpiresAt) return account;

  const stillValid = account.tokenExpiresAt.getTime() - Date.now() > REFRESH_BUFFER_MS;
  if (stillValid) return account;

  const provider = getSocialProvider(account.platform);
  if (!provider) return account;

  if (!account.refreshToken) {
    console.warn(
      `${account.platform} access token expired with no refresh token on file (id=${account.id}) — marking EXPIRED.`
    );
    return prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: "EXPIRED" },
    });
  }

  try {
    const refreshed = await provider.refresh(account.refreshToken);

    return await prisma.connectedAccount.update({
      where: { id: account.id },
      data: {
        accessToken: refreshed.accessToken,
        // Google doesn't normally reissue a refresh_token on refresh —
        // keep the one already on file unless a new one came back.
        refreshToken: refreshed.refreshToken ?? account.refreshToken,
        tokenExpiresAt: refreshed.tokenExpiresAt,
        status: "CONNECTED",
      },
    });
  } catch (error) {
    // Refresh token itself is invalid/revoked, or the vendor is
    // unreachable — either way this account needs the user to reconnect.
    console.error(`Failed to refresh ${account.platform} access token (id=${account.id})`, error);

    return prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: "EXPIRED" },
    });
  }
}
