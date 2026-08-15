import type { MediaAssetDTO } from "@/lib/media-asset/types"

/**
 * Which path actually resolved a slide's media — persisted onto
 * `CarouselSlideMedia.resolutionPath` for transparency/debugging (Developer
 * Details), and used by the caller to decide the slide's final
 * `CarouselSlideMediaType` badge.
 */
export type MediaResolutionPath =
  | "USER_PROVIDED"
  | "SOURCE_MEDIA"
  | "GENERATED_IMAGE"
  /** The plan asked for SOURCE_VIDEO/SOURCE_IMAGE but no permitted source was available (no provider configured, or nothing safely licensed came back) — a Gemini image was generated instead so the slide isn't left broken. */
  | "GENERATED_IMAGE_FALLBACK"
  | "NO_MEDIA"

export type SlideMediaResolution = {
  mediaAsset: MediaAssetDTO | null
  resolutionPath: MediaResolutionPath
}
