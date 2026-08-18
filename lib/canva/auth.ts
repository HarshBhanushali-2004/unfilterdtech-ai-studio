import { prisma } from "@/lib/prisma";
import { ensureFreshAccessToken } from "@/lib/connections/token-refresh";

import { CanvaApiError } from "./errors";

/**
 * The one place Phase 2's Canva usage (Design Import / Export) obtains an
 * access token — deliberately reuses the existing OAuth/refresh
 * architecture rather than duplicating it: `ensureFreshAccessToken`
 * (`lib/connections/token-refresh.ts`) is the same "refresh on read"
 * function `getConnections()` already calls for every platform, including
 * Canva's own rotating-refresh-token handling
 * (`lib/social/providers/canva.ts`). If the token is near/past expiry, this
 * silently refreshes it first; if the refresh itself fails, the account is
 * marked `EXPIRED` (same as it already would be for any other platform)
 * and this throws `reconnect_required` rather than handing back a token
 * that won't work.
 *
 * Never returns anything but the bare access token string — callers pass
 * it straight into `lib/canva/design-import.ts` / `lib/canva/export.ts`,
 * neither of which ever needs to know how it was obtained.
 */
export async function getCanvaAccessToken(): Promise<string> {
  const account = await prisma.connectedAccount.findFirst({ where: { platform: "CANVA" } });

  if (!account || account.status === "DISCONNECTED" || !account.accessToken) {
    throw new CanvaApiError("not_connected", "Canva is not connected.");
  }

  const fresh = await ensureFreshAccessToken(account);

  if (fresh.status !== "CONNECTED" || !fresh.accessToken) {
    throw new CanvaApiError(
      "reconnect_required",
      "The Canva connection has expired and needs to be reconnected."
    );
  }

  return fresh.accessToken;
}
