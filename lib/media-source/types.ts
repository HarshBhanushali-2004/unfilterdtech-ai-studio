import type { MediaLicenseStatus, MediaType } from "@prisma/client"

/**
 * Every source-media provider name the app knows about, implemented or not
 * — mirrors `lib/ai/image-providers/types.ts`'s `IMAGE_PROVIDER_NAMES`
 * pattern. None are registered in `manager.ts` yet (Phase 1 — AI Carousel
 * Engine, see AGENTS.md: "do not spend Phase 1 integrating many external
 * providers"); this list exists so Settings/UI can distinguish "known but
 * not wired up" from "not a real thing."
 */
export const MEDIA_SOURCE_PROVIDER_NAMES = ["stock-library"] as const
export type MediaSourceProviderName = (typeof MEDIA_SOURCE_PROVIDER_NAMES)[number]

export type MediaSearchResult = {
  /** Provider-side id — pass back to `getAsset` to resolve the full asset. */
  id: string
  type: MediaType
  previewUrl: string
  title?: string
  /** The provider's own name for display/attribution (e.g. "Pexels", "Wikimedia Commons") — distinct from `MediaSourceProviderName`, which is this app's internal registry key. */
  provider?: string
  /** The page a human could visit to see/verify this media at its source — not necessarily the same URL as `previewUrl`/the asset file itself. */
  sourceUrl?: string
  width?: number
  height?: number
  duration?: number
  licenseStatus: MediaLicenseStatus
  attribution?: Record<string, unknown>
}

export type ResolvedSourceAsset = {
  type: MediaType
  /** The actual file bytes/URL — a data URL or a URL this app is permitted to fetch and re-host. */
  url: string
  thumbnailUrl?: string
  title?: string
  provider?: string
  sourceUrl?: string
  width?: number
  height?: number
  duration?: number
  mimeType?: string
  licenseStatus: MediaLicenseStatus
  attribution?: Record<string, unknown>
}

/**
 * The contract every source-media provider implements (AGENTS.md's
 * `MediaSourceProvider`). Nothing outside `lib/media-source/` and
 * `lib/media-resolver/` should ever import a concrete provider directly —
 * always go through `manager.ts`, same discipline as
 * `lib/ai/image-providers/manager.ts`.
 */
export type MediaSourceProvider = {
  name: MediaSourceProviderName
  search(query: string): Promise<MediaSearchResult[]>
  getAsset(id: string): Promise<ResolvedSourceAsset>
}
