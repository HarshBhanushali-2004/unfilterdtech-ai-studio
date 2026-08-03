import { sampleRegionLuminance, textColorForBackground } from "./color-analysis"
import { RENDERER_FONT_FAMILY } from "./fonts"
import { resolveLogoPlacement } from "./logo-placement"
import { drawTextBlock, roundedRectPath } from "./text-renderer"
import type { CreativeConfig, LayoutDimensions, LogoVariant, TextStyle } from "./types"

type TextStylePreset = {
  headlineScale: number
  subtitleScale: number
  ctaShape: "pill" | "rounded" | "text-only"
  letterSpacing: number
}

const TEXT_STYLE_PRESETS: Record<TextStyle, TextStylePreset> = {
  bold: { headlineScale: 1, subtitleScale: 1, ctaShape: "rounded", letterSpacing: 0 },
  elegant: { headlineScale: 0.92, subtitleScale: 0.95, ctaShape: "text-only", letterSpacing: 0.5 },
  minimal: { headlineScale: 0.8, subtitleScale: 0.85, ctaShape: "text-only", letterSpacing: 0 },
  playful: { headlineScale: 1.05, subtitleScale: 1, ctaShape: "pill", letterSpacing: 0 },
}

function resolveLogoSrc(logos: CreativeConfig["logos"], variant: LogoVariant): string | null {
  return logos[variant] || logos.primary || null
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const dx = (width - drawWidth) / 2
  const dy = (height - drawHeight) / 2
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight)
}

/** Where the gradient darkens/lightens toward, and where text anchors, per layout style. */
function textRegionForLayout(
  layoutStyle: CreativeConfig["layoutStyle"],
  width: number,
  height: number
): { gradientBand: { x: number; y: number; width: number; height: number }; direction: "to-top" | "to-bottom" } {
  switch (layoutStyle) {
    case "split":
      return { gradientBand: { x: 0, y: 0, width, height: height * 0.4 }, direction: "to-bottom" }
    case "centered":
      return { gradientBand: { x: 0, y: height * 0.28, width, height: height * 0.44 }, direction: "to-bottom" }
    case "minimal":
      return { gradientBand: { x: 0, y: height * 0.72, width, height: height * 0.28 }, direction: "to-top" }
    case "bottom-aligned":
    default:
      return { gradientBand: { x: 0, y: height * 0.45, width, height: height * 0.55 }, direction: "to-top" }
  }
}

function drawGradientOverlay(
  ctx: CanvasRenderingContext2D,
  band: { x: number; y: number; width: number; height: number },
  direction: "to-top" | "to-bottom",
  tint: "dark" | "light",
  opacity: number
) {
  const gradient =
    direction === "to-top"
      ? ctx.createLinearGradient(0, band.y + band.height, 0, band.y)
      : ctx.createLinearGradient(0, band.y, 0, band.y + band.height)

  const color = tint === "dark" ? "0,0,0" : "255,255,255"
  gradient.addColorStop(0, `rgba(${color},${opacity})`)
  gradient.addColorStop(1, `rgba(${color},0)`)

  ctx.fillStyle = gradient
  ctx.fillRect(band.x, band.y, band.width, band.height)
}

function drawCtaIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, style: string, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(1.5, size * 0.14)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  ctx.beginPath()
  ctx.moveTo(x, y - size / 2)
  ctx.lineTo(x + size / 2, y)
  ctx.lineTo(x, y + size / 2)
  if (style === "outline") {
    ctx.stroke()
  } else {
    ctx.moveTo(x - size / 3, y)
    ctx.lineTo(x + size / 2, y)
    ctx.stroke()
    if (style === "duotone") {
      ctx.beginPath()
      ctx.arc(x + size / 2, y, size * 0.12, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

export type RenderCreativeInput = {
  ctx: CanvasRenderingContext2D
  dimensions: LayoutDimensions
  baseImage: HTMLImageElement
  logoImage: HTMLImageElement | null
  watermarkImage: HTMLImageElement | null
  config: CreativeConfig
}

export type RenderCreativeResult = {
  /** True when the smart logo placement heuristic moved the logo off the brand's preferred corner to avoid a visually busy area. */
  logoMoved: boolean
}

/**
 * The Creative Renderer's single entry point — composites a generated AI
 * image into a publish-ready branded creative on an already-sized Canvas
 * 2D context. Pure and synchronous (all images must already be loaded);
 * callers own the async image-loading step so this can be called
 * synchronously on every control change for a live preview.
 */
export function renderCreative({
  ctx,
  dimensions,
  baseImage,
  logoImage,
  watermarkImage,
  config,
}: RenderCreativeInput): RenderCreativeResult {
  const { width, height } = dimensions
  const shorterEdge = Math.min(width, height)
  const safeMargin = (config.safeMargin / 100) * shorterEdge
  const preset = TEXT_STYLE_PRESETS[config.textStyle]

  ctx.clearRect(0, 0, width, height)

  // Rounded corners on the whole creative.
  ctx.save()
  roundedRectPath(ctx, 0, 0, width, height, shorterEdge * 0.02)
  ctx.clip()

  drawCoverImage(ctx, baseImage, width, height)

  const { gradientBand, direction } = textRegionForLayout(config.layoutStyle, width, height)
  const luminance = sampleRegionLuminance(ctx, gradientBand, width, height)
  const textColors = textColorForBackground(luminance)
  const overlayTint = luminance.isDark ? "dark" : "light"

  if (config.layoutStyle !== "minimal" || config.overlayOpacity > 0) {
    drawGradientOverlay(ctx, gradientBand, direction, overlayTint, config.overlayOpacity / 100)
  }

  // ---- Logo ----
  const logoSrc = resolveLogoSrc(config.logos, config.logoVariant)
  let logoMoved = false
  if (logoImage && logoSrc) {
    const logoSize = shorterEdge * 0.14
    const placement = resolveLogoPlacement(ctx, width, height, logoSize, safeMargin, config.logoPosition)
    logoMoved = placement.moved

    ctx.save()
    ctx.shadowColor = "rgba(0,0,0,0.35)"
    ctx.shadowBlur = logoSize * 0.12
    const logoAspect = logoImage.width / logoImage.height
    const drawHeight = logoSize
    const drawWidth = logoSize * logoAspect
    ctx.drawImage(logoImage, placement.x, placement.y, drawWidth, drawHeight)
    ctx.restore()
  }

  // ---- Watermark (independent of the main logo) ----
  if (config.watermarkEnabled && watermarkImage) {
    const wmSize = shorterEdge * 0.1
    const wmAspect = watermarkImage.width / watermarkImage.height
    const wmWidth = wmSize * wmAspect
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.drawImage(watermarkImage, width - safeMargin - wmWidth, height - safeMargin - wmSize, wmWidth, wmSize)
    ctx.restore()
  }

  // ---- Text stack ----
  const maxTextWidth = width - safeMargin * 2
  const headingFamily = RENDERER_FONT_FAMILY[config.headingFont]
  const bodyFamily = RENDERER_FONT_FAMILY[config.bodyFont]

  const headlineSize = shorterEdge * 0.062 * preset.headlineScale
  const subtitleSize = shorterEdge * 0.03 * preset.subtitleScale
  const footerSize = shorterEdge * 0.02

  let cursorY: number
  if (config.layoutStyle === "split") {
    cursorY = safeMargin
  } else if (config.layoutStyle === "centered") {
    cursorY = height * 0.34
  } else {
    // bottom-aligned / minimal
    cursorY = height - safeMargin - (config.footer || config.website ? footerSize * 1.6 : 0) - subtitleSize * 1.6 - headlineSize * 2.4
  }

  if (preset.letterSpacing && "letterSpacing" in ctx) {
    ctx.letterSpacing = `${preset.letterSpacing}px`
  }

  if (config.headline) {
    const consumed = drawTextBlock(ctx, {
      text: config.headline,
      x: safeMargin,
      y: cursorY,
      maxWidth: maxTextWidth,
      fontSize: headlineSize,
      fontFamily: headingFamily,
      fontWeight: "700",
      color: textColors.fill,
      shadowColor: textColors.shadow,
      lineHeightMultiplier: 1.15,
      maxLines: 3,
    })
    cursorY += consumed + subtitleSize * 0.5
  }

  if (config.subtitle) {
    const consumed = drawTextBlock(ctx, {
      text: config.subtitle,
      x: safeMargin,
      y: cursorY,
      maxWidth: maxTextWidth,
      fontSize: subtitleSize,
      fontFamily: bodyFamily,
      fontWeight: "500",
      color: textColors.muted,
      shadowColor: textColors.shadow,
      lineHeightMultiplier: 1.3,
      maxLines: 2,
    })
    cursorY += consumed + subtitleSize * 0.7
  }

  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px"

  if (config.cta) {
    const ctaFontSize = subtitleSize * 0.95
    ctx.font = `700 ${ctaFontSize}px ${bodyFamily}`
    const ctaTextWidth = ctx.measureText(config.cta).width
    const iconSpace = preset.ctaShape === "text-only" ? ctaFontSize * 0.9 : 0

    if (preset.ctaShape === "text-only") {
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillStyle = config.accentColor || textColors.fill
      ctx.fillText(config.cta, safeMargin, cursorY + ctaFontSize / 2)
      drawCtaIcon(ctx, safeMargin + ctaTextWidth + iconSpace, cursorY + ctaFontSize / 2, ctaFontSize * 0.6, config.iconStyle, config.accentColor || textColors.fill)
      cursorY += ctaFontSize * 1.8
    } else {
      const paddingX = ctaFontSize * 1.1
      const paddingY = ctaFontSize * 0.7
      const buttonWidth = ctaTextWidth + paddingX * 2 + ctaFontSize * 1.2
      const buttonHeight = ctaFontSize + paddingY * 2
      const radius = preset.ctaShape === "pill" ? buttonHeight / 2 : buttonHeight * 0.22

      ctx.fillStyle = config.accentColor || config.primaryColor || "#7C3AED"
      roundedRectPath(ctx, safeMargin, cursorY, buttonWidth, buttonHeight, radius)
      ctx.fill()

      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "#FFFFFF"
      ctx.fillText(config.cta, safeMargin + paddingX, cursorY + buttonHeight / 2)
      drawCtaIcon(
        ctx,
        safeMargin + paddingX + ctaTextWidth + ctaFontSize * 0.6,
        cursorY + buttonHeight / 2,
        ctaFontSize * 0.6,
        config.iconStyle,
        "#FFFFFF"
      )

      cursorY += buttonHeight + subtitleSize * 0.6
    }
  }

  if (config.footer || config.website) {
    const footerText = [config.footer, config.website].filter(Boolean).join("  •  ")
    drawTextBlock(ctx, {
      text: footerText,
      x: safeMargin,
      y: height - safeMargin - footerSize * 1.3,
      maxWidth: maxTextWidth,
      fontSize: footerSize,
      fontFamily: bodyFamily,
      fontWeight: "500",
      color: textColors.muted,
      shadowColor: textColors.shadow,
      lineHeightMultiplier: 1.2,
      maxLines: 1,
    })
  }

  ctx.restore()

  return { logoMoved }
}
