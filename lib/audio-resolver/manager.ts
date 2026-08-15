import type { AudioProvider, AudioProviderName } from "./types"

/**
 * Registered, working audio providers — mirrors
 * `lib/media-source/manager.ts`'s empty-registry pattern exactly. No
 * licensed/royalty-free audio provider is registered today; add one by
 * implementing `AudioProvider` and registering it here — nothing else in
 * the app needs to change.
 */
const PROVIDER_REGISTRY: Partial<Record<AudioProviderName, AudioProvider>> = {}

export function getRegisteredAudioProviderNames(): AudioProviderName[] {
  return Object.keys(PROVIDER_REGISTRY) as AudioProviderName[]
}

/** Returns the configured audio provider, or `null` when none is registered/configured — callers must treat `null` as routine, not an error. */
export function getActiveAudioProvider(): AudioProvider | null {
  const configured = process.env.AUDIO_PROVIDER?.trim().toLowerCase()
  if (!configured) return null

  return PROVIDER_REGISTRY[configured as AudioProviderName] ?? null
}
