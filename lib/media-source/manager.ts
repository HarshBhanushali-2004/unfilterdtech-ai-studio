import type { MediaSourceProvider, MediaSourceProviderName } from "./types"

/**
 * Registered, working source-media providers — mirrors
 * `lib/ai/image-providers/manager.ts`'s `PROVIDER_REGISTRY` exactly.
 * Deliberately empty in Phase 1: per AGENTS.md ("Do not build a system that
 * blindly downloads and republishes random copyrighted Instagram/TikTok/
 * YouTube videos" / "do not hack an unsafe scraper"), no external
 * source-media API is wired in yet. The Media Resolver checks
 * `getActiveMediaSourceProvider()` and gracefully falls back to a
 * Gemini-generated image whenever it's null — see
 * `lib/media-resolver/service.ts`. Add a real provider by implementing
 * `MediaSourceProvider` and registering it here; nothing else in the app
 * needs to change.
 */
const PROVIDER_REGISTRY: Partial<Record<MediaSourceProviderName, MediaSourceProvider>> = {}

/** Providers that are actually implemented and callable — always empty today; see the module doc above. */
export function getRegisteredMediaSourceProviderNames(): MediaSourceProviderName[] {
  return Object.keys(PROVIDER_REGISTRY) as MediaSourceProviderName[]
}

/**
 * Returns the configured source-media provider, or `null` when none is
 * registered/configured — callers (the Media Resolver) must treat `null` as
 * an expected, routine state, not an error, and fall back accordingly.
 */
export function getActiveMediaSourceProvider(): MediaSourceProvider | null {
  const configured = process.env.MEDIA_SOURCE_PROVIDER?.trim().toLowerCase()
  if (!configured) return null

  return PROVIDER_REGISTRY[configured as MediaSourceProviderName] ?? null
}
