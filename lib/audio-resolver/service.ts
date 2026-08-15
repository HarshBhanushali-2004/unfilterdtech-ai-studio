import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import type { ReelPlanObject } from "@/lib/ai/reel-planner-schemas"

import { getActiveAudioProvider } from "./manager"

export type AudioResolutionDecision =
  /** A scene's media is a real (non-fallback) VIDEO asset — its own audio is preserved, no separate track is attached. See AGENTS.md Core Requirement #12's priority order. */
  | "ORIGINAL_VIDEO_AUDIO"
  /** A licensed/royalty-free provider resolved a track matching the plan's musicMood. */
  | "EXTERNAL_PROVIDER"
  /** No provider is configured — silent output, never a fabricated source. */
  | "UNAVAILABLE"

export type AudioResolutionResult = {
  audioAssetId: string | null
  decision: AudioResolutionDecision
}

/**
 * Resolves the soundtrack for a Reel — Phase 1C's Audio Resolver (see
 * AGENTS.md Core Requirement #11/#12). Implements the required priority
 * order even though, in this app today, every path but the last is
 * unreachable (no source-video provider is registered — see
 * `lib/media-source/manager.ts` — so no scene ever resolves to a real
 * VIDEO asset; no audio provider is registered either — see
 * `lib/audio-resolver/manager.ts`):
 *
 * 1. If any scene's resolved media is a genuine VIDEO asset (not the
 *    Gemini-generated IMAGE fallback), its own audio is preserved —
 *    `Creation.audioAssetId` stays null and callers must never attach a
 *    separate track over it.
 * 2. Otherwise, ask the configured audio provider for a track matching the
 *    plan's `musicMood`. No provider is configured today, so this always
 *    falls through.
 * 3. No provider available → silent output. `Creation.audioAssetId` stays
 *    null; the Review page must represent that honestly (see
 *    `ReelScenesGallery`'s banner), never claim a track was attached.
 */
export async function resolveAudioForReel(
  reelPlanId: string,
  plan: ReelPlanObject
): Promise<AudioResolutionResult> {
  const sceneMedia = await prisma.reelSceneMedia.findMany({
    where: { reelPlanId },
    include: { mediaAsset: true },
  })

  const hasOriginalVideo = sceneMedia.some((scene) => scene.mediaAsset?.type === "VIDEO")
  if (hasOriginalVideo) {
    return { audioAssetId: null, decision: "ORIGINAL_VIDEO_AUDIO" }
  }

  const provider = getActiveAudioProvider()
  if (!provider) {
    return { audioAssetId: null, decision: "UNAVAILABLE" }
  }

  try {
    const results = await provider.search(plan.musicMood)
    const best = results[0]
    if (!best) return { audioAssetId: null, decision: "UNAVAILABLE" }

    const resolved = await provider.getAsset(best.id)

    const audioAsset = await prisma.audioAsset.create({
      data: {
        source: "LICENSED_LIBRARY",
        licenseStatus: resolved.licenseStatus,
        provider: provider.name,
        title: resolved.title,
        artist: resolved.artist,
        mood: plan.musicMood,
        duration: resolved.duration,
        url: resolved.url,
        attribution: resolved.attribution as Prisma.InputJsonValue | undefined,
      },
    })

    return { audioAssetId: audioAsset.id, decision: "EXTERNAL_PROVIDER" }
  } catch (error) {
    console.error("[AudioResolver] Provider lookup failed, falling back to silent output:", error)
    return { audioAssetId: null, decision: "UNAVAILABLE" }
  }
}
