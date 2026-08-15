import type { ImageProviderName } from "@/lib/ai/image-providers"
import { generateImage as generateImageWithActiveProvider } from "@/lib/ai/image-providers"
import type { CarouselPlanSlide } from "@/lib/ai/carousel-planner-schemas"
import { createMediaAsset, getMediaAsset } from "@/lib/media-asset/service"
import { getActiveMediaSourceProvider } from "@/lib/media-source/manager"

import type { MediaResolutionPath, SlideMediaResolution } from "./types"

/** Maps an Image Provider's name to the broader, provider-agnostic `MediaAssetSource` bucket. */
function sourceForImageProvider(provider: ImageProviderName): "GEMINI" | "FREE_API" | "LOCAL_AI" | "PAID_PROVIDER" {
  switch (provider) {
    case "gemini":
      return "GEMINI"
    case "flux":
      return "FREE_API"
    case "local-flux":
      return "LOCAL_AI"
    case "openai":
    case "stable-diffusion":
      return "PAID_PROVIDER"
  }
}

/** Licenses that are safe to actually use — anything else (UNKNOWN/RESTRICTED) must never be persisted as a slide's media, per AGENTS.md's source-media licensing rules. */
function isSafeToUse(licenseStatus: string): boolean {
  return licenseStatus !== "UNKNOWN" && licenseStatus !== "RESTRICTED"
}

/**
 * Generates a fallback image via the existing, shared Image Provider
 * Manager (Gemini/FLUX, with Gemini's full retry/key-rotation resilience
 * already built in — see `lib/ai/gemini-provider.ts`) — never a second
 * Gemini client, never duplicated key handling.
 */
async function resolveGeneratedImage(prompt: string): Promise<SlideMediaResolution["mediaAsset"]> {
  const result = await generateImageWithActiveProvider({ prompt })

  return createMediaAsset({
    type: "IMAGE",
    source: sourceForImageProvider(result.provider),
    // AI-generated media is always cleared for use — there's no third-party
    // rights question the way there is for sourced media.
    licenseStatus: "PERMITTED",
    url: `data:${result.image.mimeType};base64,${result.image.base64}`,
    width: result.image.width ?? null,
    height: result.image.height ?? null,
    mimeType: result.image.mimeType,
    provider: result.provider,
    metadata: { prompt, generationTimeMs: result.generationTimeMs },
  })
}

export type ResolveSlideMediaInput = {
  slide: CarouselPlanSlide
  /** A pre-supplied user-uploaded MediaAsset id for this slide, when the (future) upload flow provided one. Not populated by any UI in Phase 1 — the architecture is ready for it, see AGENTS.md's "clean path for USER_PROVIDED VIDEO." */
  userProvidedAssetId?: string | null
}

/**
 * The Media Resolver — Phase 1's `CarouselSlide → MediaAsset` decision
 * point (AGENTS.md), and the *only* place that decision gets made; nothing
 * in the UI or the persistence layer should ever re-derive it. Resolution
 * order:
 *
 * 1. NO_MEDIA → no asset, nothing else runs.
 * 2. A pre-supplied user-provided asset, if one was given.
 * 3. A registered `MediaSourceProvider` (none are registered in Phase 1 —
 *    see `lib/media-source/manager.ts` — so this step is a routine no-op
 *    today, not an error; it exists so a real provider slots in later
 *    without this function changing). Any result whose license isn't
 *    actually safe to use (UNKNOWN/RESTRICTED) is discarded, never persisted.
 * 4. A Gemini-generated image via the existing Image Provider Manager —
 *    used both for genuine IMAGE slides and as the safe fallback for a
 *    VIDEO/SOURCE slide that couldn't be resolved from a real source.
 *
 * Never throws for "nothing was available" — only for a hard failure in the
 * fallback generation step itself (e.g. every Gemini key/model exhausted),
 * which the caller (`lib/carousel-plan/generate-media-for-plan.ts`) catches
 * and persists as that slide's own FAILED status, matching
 * `generateImageForSlot`'s best-effort-per-slot pattern.
 */
export async function resolveSlideMedia({
  slide,
  userProvidedAssetId,
}: ResolveSlideMediaInput): Promise<SlideMediaResolution> {
  if (slide.mediaType === "NO_MEDIA") {
    return { mediaAsset: null, resolutionPath: "NO_MEDIA" }
  }

  if (userProvidedAssetId) {
    const provided = await getMediaAsset(userProvidedAssetId)
    if (provided) {
      return { mediaAsset: provided, resolutionPath: "USER_PROVIDED" }
    }
  }

  const sourceProvider = getActiveMediaSourceProvider()
  if (sourceProvider) {
    try {
      const results = await sourceProvider.search(slide.mediaQuery)
      const best = results.find((result) => isSafeToUse(result.licenseStatus))

      if (best) {
        const resolved = await sourceProvider.getAsset(best.id)

        if (isSafeToUse(resolved.licenseStatus)) {
          const mediaAsset = await createMediaAsset({
            type: resolved.type,
            source: "SOURCE_MEDIA",
            licenseStatus: resolved.licenseStatus,
            url: resolved.url,
            thumbnailUrl: resolved.thumbnailUrl,
            width: resolved.width,
            height: resolved.height,
            duration: resolved.duration,
            mimeType: resolved.mimeType,
            // The provider's own display name (e.g. "Pexels") when it
            // supplies one, falling back to this app's internal registry
            // key — see `MediaSearchResult.provider`'s doc comment.
            provider: resolved.provider ?? sourceProvider.name,
            attribution: {
              ...resolved.attribution,
              title: resolved.title,
              sourceUrl: resolved.sourceUrl,
            },
            metadata: { query: slide.mediaQuery },
          })

          return { mediaAsset, resolutionPath: "SOURCE_MEDIA" }
        }
      }
    } catch (error) {
      // A source provider failing is never fatal to the slide — fall
      // through to the generated-image fallback below.
      console.error("[MediaResolver] Source provider lookup failed, falling back to a generated image:", error)
    }
  }

  const mediaAsset = await resolveGeneratedImage(slide.imageGenerationPrompt)
  const resolutionPath: MediaResolutionPath = slide.mediaType === "VIDEO" ? "GENERATED_IMAGE_FALLBACK" : "GENERATED_IMAGE"

  return { mediaAsset, resolutionPath }
}
