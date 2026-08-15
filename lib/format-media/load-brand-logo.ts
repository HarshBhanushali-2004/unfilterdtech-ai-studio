import { loadNodeImage } from "@/lib/creative-renderer/node-canvas"
import type { BrandRenderProfile, RenderImageLike } from "@/lib/creative-renderer/types"

/** Loads a Brand Kit's primary logo for the `branding` element — shared across every format's generation orchestration. Never throws: a logo that fails to load just means the frame renders without one, never a blocked generation. */
export async function loadBrandLogo(brandProfile: BrandRenderProfile): Promise<RenderImageLike | null> {
  const logoUrl = brandProfile.logos.primary
  if (!logoUrl) return null

  try {
    return await loadNodeImage(logoUrl)
  } catch (error) {
    console.error("[TemplateRenderer] Failed to load brand logo, rendering without it:", error)
    return null
  }
}
