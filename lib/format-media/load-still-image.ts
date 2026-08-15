import { loadNodeImage } from "@/lib/creative-renderer/node-canvas"
import type { RenderImageLike } from "@/lib/creative-renderer/types"
import type { MediaAssetDTO } from "@/lib/media-asset/types"

/**
 * Loads the still image a resolved `MediaAsset` composites into a rendered
 * frame — shared across every format. A static Instagram asset can't embed
 * a playable video (AGENTS.md — "if actual animated ... export is not
 * supported, do NOT pretend it is"), so for a VIDEO asset this always
 * prefers its poster/thumbnail over the raw video file, which the image
 * loader can't decode as a still frame anyway; the original video stays
 * reachable via `mediaAsset.url` for a future real video-aware surface. No
 * source-video provider is registered today (see
 * `lib/media-source/manager.ts`), so this path is exercised only once one
 * is — the Gemini-generated fallback is always type IMAGE with its bytes
 * directly at `url`.
 *
 * Never throws: a media file that fails to decode shouldn't fail the whole
 * item — the caller composites with `media: null` instead (the renderer's
 * tinted placeholder panel).
 */
export async function loadStillImageForCompositing(
  mediaAsset: MediaAssetDTO,
  logLabel: string
): Promise<RenderImageLike | null> {
  const stillImageUrl = mediaAsset.type === "VIDEO" ? mediaAsset.thumbnailUrl ?? mediaAsset.url : mediaAsset.url

  try {
    return await loadNodeImage(stillImageUrl)
  } catch (error) {
    console.error(`[TemplateRenderer] Failed to load media for ${logLabel}:`, error)
    return null
  }
}
