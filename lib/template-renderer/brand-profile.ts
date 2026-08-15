import type { BrandKit } from "@prisma/client"

import {
  ICON_STYLES,
  LAYOUT_STYLES,
  LOGO_POSITIONS,
  RENDERER_FONTS,
  TEXT_STYLES,
  type BrandRenderProfile,
  type IconStyle,
  type LayoutStyle,
  type LogoPosition,
  type RendererFont,
  type TextStyle,
} from "@/lib/creative-renderer/types"

/** App-wide default accent (the violet/indigo "primary action" language — see CLAUDE.md's UI/UX Guidelines) — used when a Creation has no Project/Brand Kit at all, so a carousel still looks designed rather than falling back to plain black-and-white. */
const DEFAULT_PRIMARY_COLOR = "#111827"
const DEFAULT_SECONDARY_COLOR = "#F4F4F5"
const DEFAULT_ACCENT_COLOR = "#7C3AED"

function coerceFont(value: string | null | undefined): RendererFont {
  return (RENDERER_FONTS as readonly string[]).includes(value ?? "") ? (value as RendererFont) : "Inter"
}

function coerceLogoPosition(value: string | null | undefined): LogoPosition {
  return (LOGO_POSITIONS as readonly string[]).includes(value ?? "") ? (value as LogoPosition) : "bottom-right"
}

function coerceTextStyle(value: string | null | undefined): TextStyle {
  return (TEXT_STYLES as readonly string[]).includes(value ?? "") ? (value as TextStyle) : "bold"
}

function coerceLayoutStyle(value: string | null | undefined): LayoutStyle {
  return (LAYOUT_STYLES as readonly string[]).includes(value ?? "") ? (value as LayoutStyle) : "bottom-aligned"
}

function coerceIconStyle(value: string | null | undefined): IconStyle {
  return (ICON_STYLES as readonly string[]).includes(value ?? "") ? (value as IconStyle) : "outline"
}

/**
 * Maps a `BrandKit` row to the Creative Renderer's existing
 * `BrandRenderProfile` shape — the same config surface
 * `lib/creative-renderer/compositor.ts` was already built to consume, reused
 * as-is per AGENTS.md ("Reuse the existing BrandKit and existing
 * BrandRenderProfile configuration... Do not create duplicate brand
 * configuration"). `brandKit: null` (no Project/Brand Kit selected) still
 * returns a complete, usable profile with sane app-default colors/fonts
 * rather than failing — Brand Kit application is optional everywhere else
 * in this app (see CLAUDE.md Section 9/12c), and the carousel template
 * should be no different.
 */
export function brandKitToRenderProfile(brandKit: BrandKit | null): BrandRenderProfile {
  if (!brandKit) {
    return {
      logos: {},
      watermarkEnabled: false,
      logoPosition: "bottom-right",
      safeMargin: 5,
      headingFont: "Inter",
      bodyFont: "Inter",
      overlayOpacity: 45,
      textStyle: "bold",
      layoutStyle: "bottom-aligned",
      iconStyle: "outline",
      primaryColor: DEFAULT_PRIMARY_COLOR,
      secondaryColor: DEFAULT_SECONDARY_COLOR,
      accentColor: DEFAULT_ACCENT_COLOR,
    }
  }

  return {
    logos: {
      primary: brandKit.logoUrl,
      secondary: brandKit.secondaryLogoUrl,
      white: brandKit.whiteLogoUrl,
      dark: brandKit.darkLogoUrl,
      watermark: brandKit.watermarkLogoUrl,
    },
    watermarkEnabled: brandKit.watermarkEnabled,
    logoPosition: coerceLogoPosition(brandKit.logoPosition),
    safeMargin: brandKit.safeMargin ?? 5,
    headingFont: coerceFont(brandKit.headingFont),
    bodyFont: coerceFont(brandKit.bodyFont),
    overlayOpacity: brandKit.overlayOpacity ?? 45,
    textStyle: coerceTextStyle(brandKit.textStyle),
    layoutStyle: coerceLayoutStyle(brandKit.layoutStyle),
    iconStyle: coerceIconStyle(brandKit.iconStyle),
    primaryColor: brandKit.primaryColor || DEFAULT_PRIMARY_COLOR,
    secondaryColor: brandKit.secondaryColor || DEFAULT_SECONDARY_COLOR,
    accentColor: brandKit.accentColor || DEFAULT_ACCENT_COLOR,
  }
}
