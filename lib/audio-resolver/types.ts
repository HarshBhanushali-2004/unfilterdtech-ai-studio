import type { MediaLicenseStatus } from "@prisma/client"

/**
 * Every audio provider name the app knows about, implemented or not —
 * mirrors `lib/media-source/types.ts`'s pattern exactly. None are
 * registered in `manager.ts` yet (Phase 1C, AGENTS.md Core Requirement #11:
 * "Do NOT scrape copyrighted/trending music... create the abstraction and
 * use a safe placeholder/royalty-free source where appropriate" — no safe
 * source is wired in yet, so this stays an empty, honest registry rather
 * than a placeholder that pretends to be real).
 */
export const AUDIO_PROVIDER_NAMES = ["royalty-free-library"] as const
export type AudioProviderName = (typeof AUDIO_PROVIDER_NAMES)[number]

export type AudioSearchResult = {
  /** Provider-side id — pass back to `getAsset` to resolve the full asset. */
  id: string
  title: string
  artist?: string
  duration: number
  licenseStatus: MediaLicenseStatus
  attribution?: Record<string, unknown>
}

export type ResolvedAudioAsset = {
  title: string
  artist?: string
  duration: number
  url: string
  licenseStatus: MediaLicenseStatus
  attribution?: Record<string, unknown>
}

/**
 * The contract every audio provider implements (AGENTS.md's "audio
 * resolver abstraction similar to MediaResolver"). `search` takes a mood
 * (e.g. "cinematic", "energetic" — see `ReelPlanObject.musicMood`), never a
 * literal song request — this app never lets the AI or a user ask for a
 * specific copyrighted track by name.
 */
export type AudioProvider = {
  name: AudioProviderName
  search(mood: string): Promise<AudioSearchResult[]>
  getAsset(id: string): Promise<ResolvedAudioAsset>
}
