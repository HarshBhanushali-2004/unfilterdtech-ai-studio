import { randomUUID } from "node:crypto";

import type { Platform } from "@prisma/client";

/**
 * Stands in for a real OAuth authorization-code exchange (Phase 2). Shape
 * matches exactly what a real provider callback would populate on
 * ConnectedAccount, so swapping this out later doesn't touch the caller.
 */
export type MockAccountPayload = {
  platformAccountId: string;
  accountName: string;
  accountUsername: string;
  profileImage: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
};

const MOCK_PROFILES: Record<
  Platform,
  { accountName: string; accountUsername: string }
> = {
  INSTAGRAM: { accountName: "UnfilterdTech", accountUsername: "unfilterdtech" },
  FACEBOOK: { accountName: "UnfilterdTech", accountUsername: "unfilterdtech" },
  LINKEDIN: {
    accountName: "UnfilterdTech AI Studio",
    accountUsername: "unfilterdtech-ai-studio",
  },
  TWITTER: { accountName: "UnfilterdTech", accountUsername: "unfilterdtech" },
  YOUTUBE: { accountName: "UnfilterdTech", accountUsername: "unfilterdtech" },
  // Unreachable in practice — CANVA is in OAUTH_ENABLED_PLATFORMS
  // (lib/connections/platforms.ts), so ConnectionCard always sends it
  // through the real `/api/canva/connect` PKCE flow, never this mock path.
  // Still required: MOCK_PROFILES is a Record<Platform, ...>, so every enum
  // member needs an entry for this file to type-check.
  CANVA: { accountName: "UnfilterdTech", accountUsername: "unfilterdtech" },
};

const MOCK_TOKEN_LIFETIME_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export function buildMockAccountPayload(platform: Platform): MockAccountPayload {
  const profile = MOCK_PROFILES[platform];

  return {
    ...profile,
    // No real profile photo in mock mode — the UI always renders a
    // placeholder avatar instead of relying on this being set.
    profileImage: null,
    platformAccountId: `mock_${platform.toLowerCase()}_${randomUUID()}`,
    accessToken: `mock_access_${randomUUID()}`,
    refreshToken: `mock_refresh_${randomUUID()}`,
    tokenExpiresAt: new Date(Date.now() + MOCK_TOKEN_LIFETIME_MS),
  };
}
