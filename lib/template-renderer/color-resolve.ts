import type { BrandRenderProfile } from "@/lib/creative-renderer/types"

import type { TemplateElement } from "./types"

/**
 * Small, pure color-resolution helpers shared by every renderer that draws
 * a `FormatLayout` — today `render-frame.ts` (Canvas 2D) and
 * `lib/canva/pptx-builder.ts` (PPTX shapes/text). Extracted out of
 * `render-frame.ts` (Phase 2 — "Edit in Canva", see
 * CANVA_NEXT_PHASE_PLAN.md) so the PPTX builder resolves `"auto"` /
 * `"brand-primary"` / `"brand-accent"` backgrounds and text colors exactly
 * the same way the Canvas renderer does, instead of re-deriving the same
 * logic a second time. Deliberately separate from
 * `lib/creative-renderer/color-analysis.ts`, which samples *pixel data*
 * from a drawn photo — these functions never look at pixels, only at the
 * template's own declared colors.
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return null

  const value = match[1]
  const expanded = value.length === 3 ? value.split("").map((c) => c + c).join("") : value

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  }
}

/** Perceptual-luminance darkness check. Unparseable input is treated as dark — the safer default (white text stays legible on almost anything; the reverse doesn't). */
export function isColorDark(color: string): boolean {
  const rgb = hexToRgb(color)
  if (!rgb) return true

  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
  return luminance < 140
}

export function autoTextColor(surfaceColor: string): string {
  return isColorDark(surfaceColor) ? "#FFFFFF" : "#14151A"
}

export function autoMutedTextColor(surfaceColor: string): string {
  return isColorDark(surfaceColor) ? "rgba(255,255,255,0.78)" : "rgba(20,21,26,0.72)"
}

export function resolveBackgroundColor(
  value: TemplateElement["background"],
  brand: BrandRenderProfile,
  pageBackground: string
): string | null {
  switch (value) {
    case undefined:
    case "transparent":
      return null
    case "auto":
      return pageBackground
    case "brand-primary":
      return brand.primaryColor
    case "brand-accent":
      return brand.accentColor
    default:
      return value
  }
}

export function resolveTextColor(
  el: TemplateElement,
  brand: BrandRenderProfile,
  pageBackground: string,
  muted: boolean
): string {
  const elementSurface = resolveBackgroundColor(el.background, brand, pageBackground) ?? pageBackground

  if (el.color === "auto" || el.color === undefined) {
    return muted ? autoMutedTextColor(elementSurface) : autoTextColor(elementSurface)
  }

  return el.color
}

/** The page's own resolved background color — `render-frame.ts` and the
 * PPTX builder both need this before they can resolve any element's color. */
export function resolvePageBackground(
  background: { type: "solid"; color: "auto" | "brand-primary" | string },
  brand: BrandRenderProfile
): string {
  return background.color === "auto" || background.color === "brand-primary" ? brand.primaryColor : background.color
}
