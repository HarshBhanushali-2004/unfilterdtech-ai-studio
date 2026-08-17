import { Platform } from "@prisma/client";

/**
 * Display order for the Connections page, derived from the Prisma enum so
 * the two can't drift — edit the platform list in schema.prisma, not here.
 */
export const SUPPORTED_PLATFORMS: Platform[] = Object.values(Platform);

export const PLATFORM_LABELS: Record<Platform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  TWITTER: "X (Twitter)",
  YOUTUBE: "YouTube",
  CANVA: "Canva",
};

export const PLATFORM_DESCRIPTIONS: Record<Platform, string> = {
  INSTAGRAM: "Posts, carousels, stories, and reels.",
  FACEBOOK: "Page posts and stories.",
  LINKEDIN: "Company page posts.",
  TWITTER: "Posts and threads.",
  YOUTUBE: "Shorts and video uploads.",
  CANVA: "Create and manage designs with Canva.",
};

/**
 * Platforms with a real OAuth provider wired in (`lib/social/index.ts`) —
 * used only by `ConnectionCard` to decide whether "Connect" performs a real
 * OAuth redirect or falls back to the Phase 1 mock `connectPlatform` action
 * for platforms not implemented yet. Every entry here except CANVA redirects
 * to `/api/social/<platform>/connect`; CANVA redirects to `/api/canva/connect`
 * instead, because its OAuth flow requires PKCE and has its own dedicated
 * route pair (`app/api/canva/connect`, `app/api/canva/oauth/callback`) rather
 * than the generic `app/api/social/[platform]/**` ones — see
 * `ConnectionCard.handleConnect` and `lib/social/providers/canva.ts`'s doc
 * comment.
 *
 * Deliberately hand-duplicated from `lib/social`'s provider registry rather
 * than imported from it: `lib/social/**` reads OAuth client secrets and
 * makes outbound provider calls, so it must never be reachable from a
 * "use client" file's import graph — this file (already imported by
 * ConnectionCard) is the one safe place for that fact to live client-side.
 * Keep this list in sync with `PROVIDERS` in `lib/social/index.ts` by hand
 * when a new provider is added.
 */
export const OAUTH_ENABLED_PLATFORMS: Platform[] = ["YOUTUBE", "FACEBOOK", "INSTAGRAM", "CANVA"];
