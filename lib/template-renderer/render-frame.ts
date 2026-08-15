import { drawTextBlock, roundedRectPath } from "@/lib/creative-renderer/text-renderer"
import type { BrandRenderProfile, RenderContext2DWithImages, RenderImageLike } from "@/lib/creative-renderer/types"

import type { FormatLayout, FrameContent, TemplateElement } from "./types"

// ---- Small, local color-math helpers -------------------------------------
// Deliberately separate from `lib/creative-renderer/color-analysis.ts`,
// which samples *pixel data* from a drawn photo (`getImageData`) to decide
// contrast — this renderer never overlays text on top of media (the media
// frame is its own contained element on every format's layout, never
// full-bleed-under-text), so every text element sits on a background color
// this renderer already knows analytically. Sampling pixels for a color we
// chose ourselves would be pointless work, not "reuse."

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
function isColorDark(color: string): boolean {
  const rgb = hexToRgb(color)
  if (!rgb) return true

  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
  return luminance < 140
}

function autoTextColor(surfaceColor: string): string {
  return isColorDark(surfaceColor) ? "#FFFFFF" : "#14151A"
}

function autoMutedTextColor(surfaceColor: string): string {
  return isColorDark(surfaceColor) ? "rgba(255,255,255,0.78)" : "rgba(20,21,26,0.72)"
}

// ---- Element-level resolution ---------------------------------------------

function resolveBackgroundColor(value: TemplateElement["background"], brand: BrandRenderProfile, pageBackground: string): string | null {
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

function resolveTextColor(el: TemplateElement, brand: BrandRenderProfile, pageBackground: string, muted: boolean): string {
  const elementSurface = resolveBackgroundColor(el.background, brand, pageBackground) ?? pageBackground

  if (el.color === "auto" || el.color === undefined) {
    return muted ? autoMutedTextColor(elementSurface) : autoTextColor(elementSurface)
  }

  return el.color
}

/** Phase 1 bundles only Inter for server-side rendering (see `lib/creative-renderer/node-canvas.ts`) — every RendererFont choice resolves to it for now; this is the single place that changes once more fonts are bundled. */
function nodeFontFamily(): string {
  return "Inter"
}

function drawCoverImageInRect(ctx: RenderContext2DWithImages, image: RenderImageLike, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const dx = x + (width - drawWidth) / 2
  const dy = y + (height - drawHeight) / 2
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight)
}

export type RenderFrameInput = {
  layout: FormatLayout
  content: FrameContent
  /** Pre-loaded cover media for the `mediaFrame` element — null when there's nothing to draw there (see `noMedia` for why). */
  media: RenderImageLike | null
  /**
   * True when the plan deliberately decided this frame has no media
   * (`ItemMediaType.NO_MEDIA`, reusing `CarouselSlideMediaType` — see
   * `prisma/schema.prisma`) — as opposed to `media` being null because a
   * resolved IMAGE/VIDEO asset merely failed to decode (a rare edge case;
   * a frame whose media resolution failed outright never reaches this
   * renderer at all, since that's persisted as the frame's own FAILED
   * status with no rendered image). Changes how the `mediaFrame` element
   * renders: a designed NO_MEDIA frame gets a real typography-first
   * treatment (the media frame's space is folded into an expanded,
   * centered headline) rather than an empty placeholder panel.
   */
  noMedia: boolean
  /** Pre-loaded brand logo for the `branding` element — null omits the mark and shows text only (or nothing, if `brandLabel` is also empty). */
  logo: RenderImageLike | null
  brand: BrandRenderProfile
  /** Brand name/website shown in the `branding` element. Empty string is fine — the element just renders whatever it has (logo only, text only, or neither). */
  brandLabel: string
}

/**
 * Draws one frame — a carousel slide, the one post, a story frame, or a
 * reel scene's storyboard preview — onto an already-sized Canvas 2D
 * context by walking the format's `layout.elements[]`. The single renderer
 * every content format shares (Phase 1C, AGENTS.md Core Requirement #16:
 * "renderCarouselSlide() / renderPost() / renderStoryFrame() /
 * renderReelScene() ... all consuming the same TemplateDefinition" — this
 * is that shared function; format-specific wrapper names exist only as
 * thin call sites in each format's generation module, not as separate
 * rendering engines). Reuses `drawTextBlock`/`roundedRectPath`
 * (`lib/creative-renderer/text-renderer.ts`) so text goes through the same
 * wrapping/clamping logic everywhere. Pure and synchronous — the caller
 * owns loading the media/logo images and creating the canvas.
 */
export function renderFrame(ctx: RenderContext2DWithImages, input: RenderFrameInput): void {
  const { layout, content, media, noMedia, logo, brand, brandLabel } = input
  const { width, height } = layout.canvas

  const pageBackground =
    layout.background.color === "auto" || layout.background.color === "brand-primary"
      ? brand.primaryColor
      : layout.background.color

  ctx.fillStyle = pageBackground
  ctx.fillRect(0, 0, width, height)

  // A designed NO_MEDIA frame folds the media frame's vertical space into
  // an expanded headline instead of leaving an empty panel — see the
  // `noMedia` doc comment above.
  const mediaFrameEl = layout.elements.find((el) => el.type === "mediaFrame")
  const expandHeadlineThrough = noMedia && mediaFrameEl ? mediaFrameEl.y + mediaFrameEl.height : null

  for (const el of layout.elements) {
    switch (el.type) {
      case "category": {
        if (!content.category) break

        const text = content.category.toUpperCase()
        const fontFamily = nodeFontFamily()
        ctx.font = `${el.fontWeight ?? "700"} ${el.fontSize ?? 24}px ${fontFamily}`
        const paddingX = (el.fontSize ?? 24) * 0.85
        const pillWidth = Math.min(el.width, ctx.measureText(text).width + paddingX * 2)
        const bg = resolveBackgroundColor(el.background, brand, pageBackground)

        if (bg) {
          ctx.fillStyle = bg
          roundedRectPath(ctx, el.x, el.y, pillWidth, el.height, el.borderRadius ?? el.height / 2)
          ctx.fill()
        }

        ctx.fillStyle = resolveTextColor(el, brand, pageBackground, false)
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"
        ctx.fillText(text, el.x + paddingX, el.y + el.height / 2)
        break
      }

      case "progress": {
        if (!content.progress) break

        ctx.font = `${el.fontWeight ?? "600"} ${el.fontSize ?? 24}px ${nodeFontFamily()}`
        ctx.fillStyle = resolveTextColor(el, brand, pageBackground, true)
        ctx.textAlign = el.align ?? "right"
        ctx.textBaseline = "middle"
        const anchorX = ctx.textAlign === "right" ? el.x + el.width : el.x
        ctx.fillText(content.progress, anchorX, el.y + el.height / 2)
        break
      }

      case "headline": {
        if (!content.headline) break

        if (expandHeadlineThrough !== null) {
          // Typography-first treatment: bigger, centered, filling the
          // combined headline + media-frame region.
          const expandedHeight = expandHeadlineThrough - el.y
          drawTextBlock(ctx, {
            text: content.headline,
            x: el.x,
            y: el.y + expandedHeight * 0.18,
            maxWidth: el.width,
            fontSize: (el.fontSize ?? 56) * 1.25,
            fontFamily: nodeFontFamily(),
            fontWeight: el.fontWeight ?? "700",
            color: resolveTextColor(el, brand, pageBackground, false),
            lineHeightMultiplier: el.lineHeight ?? 1.15,
            maxLines: (el.maxLines ?? 3) + 1,
            align: "left",
          })
          break
        }

        drawTextBlock(ctx, {
          text: content.headline,
          x: el.x,
          y: el.y,
          maxWidth: el.width,
          fontSize: el.fontSize ?? 56,
          fontFamily: nodeFontFamily(),
          fontWeight: el.fontWeight ?? "700",
          color: resolveTextColor(el, brand, pageBackground, false),
          lineHeightMultiplier: el.lineHeight ?? 1.1,
          maxLines: el.maxLines ?? 3,
          align: el.align ?? "left",
        })
        break
      }

      case "mediaFrame": {
        if (noMedia) {
          // Folded into the expanded headline above — deliberately nothing
          // to draw here, not even a placeholder panel.
          break
        }

        ctx.save()
        roundedRectPath(ctx, el.x, el.y, el.width, el.height, el.borderRadius ?? 24)
        ctx.clip()

        if (media) {
          drawCoverImageInRect(ctx, media, el.x, el.y, el.width, el.height)
        } else {
          // A resolved IMAGE/VIDEO asset that failed to decode — a rare
          // edge case (resolution itself failing marks the whole frame
          // FAILED before rendering ever runs). A subtle tinted panel so
          // the frame still reads as intentional rather than broken.
          ctx.fillStyle = isColorDark(pageBackground) ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
          ctx.fillRect(el.x, el.y, el.width, el.height)
        }

        ctx.restore()
        break
      }

      case "body": {
        if (!content.body) break
        drawTextBlock(ctx, {
          text: content.body,
          x: el.x,
          y: el.y,
          maxWidth: el.width,
          fontSize: el.fontSize ?? 28,
          fontFamily: nodeFontFamily(),
          fontWeight: el.fontWeight ?? "500",
          color: resolveTextColor(el, brand, pageBackground, true),
          lineHeightMultiplier: el.lineHeight ?? 1.3,
          maxLines: el.maxLines ?? 3,
          align: el.align ?? "left",
        })
        break
      }

      case "cta": {
        if (!content.cta) break

        const fontFamily = nodeFontFamily()
        ctx.font = `${el.fontWeight ?? "700"} ${el.fontSize ?? 26}px ${fontFamily}`
        const paddingX = (el.fontSize ?? 26) * 1.1
        const pillWidth = Math.min(el.width, ctx.measureText(content.cta).width + paddingX * 2)
        const bg = resolveBackgroundColor(el.background, brand, pageBackground) ?? brand.accentColor

        ctx.fillStyle = bg
        roundedRectPath(ctx, el.x, el.y, pillWidth, el.height, el.borderRadius ?? el.height / 2)
        ctx.fill()

        ctx.fillStyle = autoTextColor(bg)
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(content.cta, el.x + pillWidth / 2, el.y + el.height / 2)
        break
      }

      case "branding": {
        let textX = el.x

        if (logo) {
          const logoSize = el.height
          const logoAspect = logo.width / logo.height
          const logoWidth = logoSize * logoAspect
          ctx.drawImage(logo, el.x, el.y, logoWidth, logoSize)
          textX = el.x + logoWidth + logoSize * 0.4
        }

        if (brandLabel) {
          ctx.font = `${el.fontWeight ?? "600"} ${el.fontSize ?? 22}px ${nodeFontFamily()}`
          ctx.fillStyle = resolveTextColor(el, brand, pageBackground, true)
          ctx.textAlign = "left"
          ctx.textBaseline = "middle"
          ctx.fillText(brandLabel, textX, el.y + el.height / 2)
        }
        break
      }
    }
  }
}
