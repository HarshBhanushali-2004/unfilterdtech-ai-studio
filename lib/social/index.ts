import type { Platform } from "@prisma/client";

import { googleProvider } from "./providers/google";
import type { SocialProvider } from "./types";

export type { SocialProvider } from "./types";
export { SocialAuthError } from "./errors";
export type { SocialAuthErrorCode } from "./errors";

/**
 * Maps each Platform card to the OAuth vendor that actually handles it.
 * Google is the vendor for YOUTUBE today. Meta will cover INSTAGRAM +
 * FACEBOOK (one provider, registered twice), LINKEDIN and TWITTER each get
 * their own `providers/*.ts` file — add the mapping here, never inline a
 * vendor's logic in a route handler or server action.
 */
const PROVIDERS: Partial<Record<Platform, SocialProvider>> = {
  YOUTUBE: googleProvider,
};

/** Returns null for a platform with no real provider wired in yet — callers
 * (route handlers, `disconnectPlatform`) treat that as "stay on the Phase 1
 * mock flow for now", not an error. */
export function getSocialProvider(platform: Platform): SocialProvider | null {
  return PROVIDERS[platform] ?? null;
}
