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
};

export const PLATFORM_DESCRIPTIONS: Record<Platform, string> = {
  INSTAGRAM: "Posts, carousels, stories, and reels.",
  FACEBOOK: "Page posts and stories.",
  LINKEDIN: "Company page posts.",
  TWITTER: "Posts and threads.",
  YOUTUBE: "Shorts and video uploads.",
};

/**
 * Platforms with a real OAuth provider wired in (`lib/social/index.ts`) —
 * used only by `ConnectionCard` to decide whether "Connect" performs a real
 * OAuth redirect (`/api/social/<platform>/connect`) or falls back to the
 * Phase 1 mock `connectPlatform` action for platforms not implemented yet.
 *
 * Deliberately hand-duplicated from `lib/social`'s provider registry rather
 * than imported from it: `lib/social/**` reads OAuth client secrets and
 * makes outbound provider calls, so it must never be reachable from a
 * "use client" file's import graph — this file (already imported by
 * ConnectionCard) is the one safe place for that fact to live client-side.
 * Keep this list in sync with `PROVIDERS` in `lib/social/index.ts` by hand
 * when a new provider is added.
 */
export const OAUTH_ENABLED_PLATFORMS: Platform[] = ["YOUTUBE", "FACEBOOK", "INSTAGRAM"];
