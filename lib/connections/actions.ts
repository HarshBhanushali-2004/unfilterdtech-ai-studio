"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSocialProvider } from "@/lib/social";
import { formatZodError } from "@/lib/validation";

import { toConnectionListItem, type ConnectionListItem } from "./dto";
import { buildMockAccountPayload } from "./mock-data";
import { SUPPORTED_PLATFORMS } from "./platforms";
import { PlatformSchema } from "./schema";
import { ensureFreshAccessToken } from "./token-refresh";

/**
 * "Refresh on read" — before building the DTO, every real (non-mock)
 * connection gets a chance to silently renew its access token if it's
 * near/past expiry (see `lib/connections/token-refresh.ts`). Mock
 * connections and already-fresh tokens pass through with no extra work.
 */
export async function getConnections(): Promise<ConnectionListItem[]> {
  const accounts = await prisma.connectedAccount.findMany({
    where: { platform: { in: SUPPORTED_PLATFORMS } },
  });

  const freshened = await Promise.all(accounts.map(ensureFreshAccessToken));

  return SUPPORTED_PLATFORMS.map((platform) =>
    toConnectionListItem(
      platform,
      freshened.find((account) => account.platform === platform)
    )
  );
}

/**
 * Simulates a successful OAuth connection — no provider is called. Used for
 * every platform without a real provider yet (see `lib/social/index.ts`);
 * YOUTUBE goes through `app/api/social/[platform]/callback/route.ts`
 * instead, which upserts the same way but with real tokens/profile data.
 */
export async function connectPlatform(platform: unknown) {
  const validation = PlatformSchema.safeParse(platform);

  if (!validation.success) {
    throw new Error(formatZodError(validation.error));
  }

  const mockAccount = buildMockAccountPayload(validation.data);

  const existing = await prisma.connectedAccount.findFirst({
    where: { platform: validation.data },
  });

  const data = { ...mockAccount, status: "CONNECTED" as const, connectedAt: new Date() };

  if (existing) {
    await prisma.connectedAccount.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.connectedAccount.create({
      data: { platform: validation.data, ...data },
    });
  }

  revalidatePath("/connections");
}

/**
 * Revokes the stored credential (real providers only — see
 * `lib/social/index.ts`) and deletes the row. Best-effort on the revoke: if
 * the upstream call fails (already revoked, network error, ...), the local
 * disconnect still proceeds — a user must always be able to remove a
 * connection from this app even if the vendor is unreachable.
 */
export async function disconnectPlatform(platform: unknown) {
  const validation = PlatformSchema.safeParse(platform);

  if (!validation.success) {
    throw new Error(formatZodError(validation.error));
  }

  const existing = await prisma.connectedAccount.findFirst({
    where: { platform: validation.data },
  });

  if (existing?.accessToken) {
    const provider = getSocialProvider(validation.data);

    if (provider) {
      try {
        await provider.disconnect(existing.accessToken);
      } catch (error) {
        console.error(`Failed to revoke ${validation.data} token upstream`, error);
      }
    }
  }

  await prisma.connectedAccount.deleteMany({
    where: { platform: validation.data },
  });

  revalidatePath("/connections");
}
