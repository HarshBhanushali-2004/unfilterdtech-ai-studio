import type { Platform } from "@prisma/client";

import { canvaProvider } from "./providers/canva";
import { googleProvider } from "./providers/google";
import { facebookProvider, instagramProvider } from "./providers/meta";
import type { SocialProvider } from "./types";

export type { SocialProvider } from "./types";
export { SocialAuthError } from "./errors";
export type { SocialAuthErrorCode } from "./errors";

/**
 * Maps each Platform card to the OAuth vendor that actually handles it.
 * Google is the vendor for YOUTUBE. Meta is the vendor for both FACEBOOK
 * and INSTAGRAM (one Meta App, two `SocialProvider` implementations in
 * `providers/meta.ts` — see that file's doc comment for why Instagram
 * publishing goes through a Facebook Page rather than its own OAuth). Canva
 * is its own vendor for CANVA (`providers/canva.ts`) — this registry entry
 * is what makes token-refresh.ts and disconnectPlatform work for it exactly
 * like every other platform, even though *connecting* Canva has its own
 * dedicated PKCE routes (`app/api/canva/**`) rather than going through
 * `app/api/social/[platform]/connect`. LINKEDIN and TWITTER each get their
 * own `providers/*.ts` file when implemented — add the mapping here, never
 * inline a vendor's logic in a route handler or server action.
 */
const PROVIDERS: Partial<Record<Platform, SocialProvider>> = {
  YOUTUBE: googleProvider,
  FACEBOOK: facebookProvider,
  INSTAGRAM: instagramProvider,
  CANVA: canvaProvider,
};

/** Returns null for a platform with no real provider wired in yet — callers
 * (route handlers, `disconnectPlatform`) treat that as "stay on the Phase 1
 * mock flow for now", not an error. */
export function getSocialProvider(platform: Platform): SocialProvider | null {
  return PROVIDERS[platform] ?? null;
}
