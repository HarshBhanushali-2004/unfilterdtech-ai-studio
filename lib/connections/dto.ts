import type { ConnectedAccount, ConnectionStatus, Platform } from "@prisma/client";

/**
 * The client-safe shape of a connection. Deliberately excludes
 * `accessToken`/`refreshToken`/`tokenExpiresAt`/`userId` — those never need
 * to leave the server, connected or not.
 */
export type ConnectionListItem = {
  id: string | null;
  platform: Platform;
  status: ConnectionStatus;
  accountName: string | null;
  accountUsername: string | null;
  profileImage: string | null;
  platformAccountId: string | null;
  /** ISO string; set whenever this platform has ever been connected
   * (CONNECTED or EXPIRED) — null only when no row exists at all. Sourced
   * from `connectedAt`, not `updatedAt`: a silent background token refresh
   * (`lib/connections/token-refresh.ts`) also touches `updatedAt`, which
   * would otherwise make "last connected" creep forward on its own. */
  lastConnectedAt: string | null;
};

/** Builds the DTO for a platform, whether or not a row exists for it yet —
 * an absent row just means "never connected", not an error. */
export function toConnectionListItem(
  platform: Platform,
  account: ConnectedAccount | undefined
): ConnectionListItem {
  if (!account) {
    return {
      id: null,
      platform,
      status: "DISCONNECTED",
      accountName: null,
      accountUsername: null,
      profileImage: null,
      platformAccountId: null,
      lastConnectedAt: null,
    };
  }

  return {
    id: account.id,
    platform: account.platform,
    status: account.status,
    accountName: account.accountName,
    accountUsername: account.accountUsername,
    profileImage: account.profileImage,
    platformAccountId: account.platformAccountId,
    lastConnectedAt: account.connectedAt?.toISOString() ?? null,
  };
}
