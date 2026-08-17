import { drawTextBlock, roundedRectPath, wrapText } from "@/lib/creative-renderer/text-renderer"
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
  // whichever text element actually sits next to it, instead of leaving an
  // empty panel — see the `noMedia` doc comment above. Phase 1C.5 note: this
  // used to always target `headline`, assuming headline directly precedes
  // mediaFrame (true for the original single default layout) — but
  // compositions now vary in shape: `text-first` has `body` adjacent to
  // `mediaFrame` instead, and `framed-editorial` puts `mediaFrame` *before*
  // `headline`. So this looks at mediaFrame's actual neighbors in
  // `elements[]` and expands whichever one (`headline` or `body`) is
  // actually adjacent to it, in whichever direction that is — confirmed
  // against a real NO_MEDIA `text-first` carousel slide during Phase 1C.5
  // visual QA, where the old headline-only assumption left a large dead gap
  // instead of filling the reclaimed space.
  const mediaFrameIndex = layout.elements.findIndex((el) => el.type === "mediaFrame")
  let expandTarget: TemplateElement | undefined
  let expandRegionStart = 0
  let expandRegionEnd = 0

  if (noMedia && mediaFrameIndex >= 0) {
    const mediaFrameEl = layout.elements[mediaFrameIndex]
    const preceding = mediaFrameIndex > 0 ? layout.elements[mediaFrameIndex - 1] : undefined
    const following = mediaFrameIndex < layout.elements.length - 1 ? layout.elements[mediaFrameIndex + 1] : undefined
    const isTextish = (el: TemplateElement | undefined): el is TemplateElement => el?.type === "headline" || el?.type === "body"
    const hasContent = (el: TemplateElement) => (el.type === "headline" ? !!content.headline : !!content.body)

    const adjacent = isTextish(preceding) ? preceding : isTextish(following) ? following : undefined

    if (adjacent && hasContent(adjacent)) {
      expandTarget = adjacent
      expandRegionStart = Math.min(mediaFrameEl.y, adjacent.y)
      expandRegionEnd = Math.max(mediaFrameEl.y + mediaFrameEl.height, adjacent.y + adjacent.height)
    } else if (content.headline) {
      // The AI plan schemas allow an empty `body` (`looseText`, no min
      // length — e.g. a punchy hook slide with no supporting copy), so the
      // element literally adjacent to mediaFrame can have nothing to draw.
      // Rather than reclaim the space for text that isn't there (leaving it
      // dead again), fall back to the headline even when it isn't adjacent.
      const headlineEl = layout.elements.find((el) => el.type === "headline")
      if (headlineEl) {
        expandTarget = headlineEl
        expandRegionStart = Math.min(mediaFrameEl.y, headlineEl.y)
        // Prefer ending the region just above a real CTA (if one exists)
        // over reaching all the way to mediaFrame's own bottom edge — keeps
        // the centered headline visually paired with its own CTA instead of
        // stranding a gap between them.
        const ctaEl = content.cta ? layout.elements.find((el) => el.type === "cta") : undefined
        expandRegionEnd = ctaEl ? ctaEl.y - 40 : Math.max(mediaFrameEl.y + mediaFrameEl.height, headlineEl.y + headlineEl.height)
      }
    }
  }

  /** Shared by the `headline`/`body` cases below — draws `text` bigger and vertically centered within the reclaimed `[expandRegionStart, expandRegionEnd]` region rather than at the element's own fixed position/size. */
  function drawExpandedText(el: TemplateElement, text: string, sizeMultiplier: number, defaultFontSize: number, defaultFontWeight: string, defaultLineHeight: number, defaultMaxLines: number, color: string, letterSpacing?: string) {
    const fontSize = (el.fontSize ?? defaultFontSize) * sizeMultiplier
    const lineHeightMultiplier = el.lineHeight ?? defaultLineHeight
    const maxLines = (el.maxLines ?? defaultMaxLines) + 1
    const fontFamily = nodeFontFamily()

    ctx.font = `${el.fontWeight ?? defaultFontWeight} ${fontSize}px ${fontFamily}`
    const lineCount = Math.min(Math.max(wrapText(ctx, text, el.width).length, 1), maxLines)
    const blockHeight = lineCount * fontSize * lineHeightMultiplier
    const regionHeight = expandRegionEnd - expandRegionStart
    const startY = expandRegionStart + Math.max(0, (regionHeight - blockHeight) / 2)

    drawTextBlock(ctx, {
      text,
      x: el.x,
      y: startY,
      maxWidth: el.width,
      fontSize,
      fontFamily,
      fontWeight: el.fontWeight ?? defaultFontWeight,
      color,
      lineHeightMultiplier,
      maxLines,
      align: "left",
      letterSpacing,
    })
  }

  for (const el of layout.elements) {
    switch (el.type) {
      case "category": {
        if (!content.category) break

        const text = content.category.toUpperCase()
        const fontFamily = nodeFontFamily()
        const fontSize = el.fontSize ?? 24
        ctx.font = `${el.fontWeight ?? "700"} ${fontSize}px ${fontFamily}`
        // A tracked-out "kicker" — small caps with generous letter-spacing
        // is the real editorial device this stands in for (vs. a plain
        // tight badge, which reads as a generic app/SaaS chip regardless of
        // its color — Phase 1C.6 QA feedback: "category badge feels
        // generic"). Set before `measureText` so the pill sizes around the
        // spaced-out text, not the unspaced string.
        if ("letterSpacing" in ctx) ctx.letterSpacing = `${(fontSize * 0.06).toFixed(1)}px`
        const paddingX = fontSize * 0.85
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
        if ("letterSpacing" in ctx) ctx.letterSpacing = "0px"
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

        // A large bold headline set at default (zero) tracking is one of
        // the more recognizable "generic AI card" tells — real editorial
        // mastheads tighten big display type slightly (Phase 1C.6 QA
        // feedback: "headline treatment still feels generic"). Scales with
        // font size so it stays proportionate whether this composition's
        // headline is 40px or 64px.
        const headlineFontSize = el.fontSize ?? 56
        const headlineLetterSpacing = `${(-headlineFontSize * 0.015).toFixed(1)}px`

        if (el === expandTarget) {
          drawExpandedText(el, content.headline, 1.25, 56, "700", 1.15, 3, resolveTextColor(el, brand, pageBackground, false), headlineLetterSpacing)
          break
        }

        drawTextBlock(ctx, {
          text: content.headline,
          x: el.x,
          y: el.y,
          maxWidth: el.width,
          fontSize: headlineFontSize,
          fontFamily: nodeFontFamily(),
          fontWeight: el.fontWeight ?? "700",
          color: resolveTextColor(el, brand, pageBackground, false),
          lineHeightMultiplier: el.lineHeight ?? 1.1,
          maxLines: el.maxLines ?? 3,
          align: el.align ?? "left",
          letterSpacing: headlineLetterSpacing,
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

        // Phase 1C.5's "framed inset" treatment — an inward stroke so the
        // photo reads as deliberately framed rather than just a boxed crop.
        // Full-bleed compositions never set `borderWidth`, so this is a
        // no-op for them.
        if (el.borderWidth) {
          ctx.save()
          const inset = el.borderWidth / 2
          roundedRectPath(ctx, el.x + inset, el.y + inset, el.width - el.borderWidth, el.height - el.borderWidth, Math.max(0, (el.borderRadius ?? 24) - inset))
          ctx.lineWidth = el.borderWidth
          ctx.strokeStyle =
            el.borderColor === "brand-accent"
              ? brand.accentColor
              : el.borderColor === "auto" || el.borderColor === undefined
                ? resolveTextColor(el, brand, pageBackground, true)
                : el.borderColor
          ctx.stroke()
          ctx.restore()
        }
        break
      }

      case "scrim": {
        // A legibility gradient behind text sitting directly over a
        // full-bleed image — see `TemplateElementType`'s doc comment.
        // Transparent at the edge furthest from `scrimDirection`, opaque at
        // the near edge, so text anchored at that edge stays readable
        // regardless of what the underlying photo looks like.
        const toTop = el.scrimDirection === "to-top"
        const gradient = toTop
          ? ctx.createLinearGradient(0, el.y + el.height, 0, el.y)
          : ctx.createLinearGradient(0, el.y, 0, el.y + el.height)

        const scrimColor = el.color && el.color !== "auto" ? el.color : "rgba(8,9,12,0.82)"
        gradient.addColorStop(0, "rgba(0,0,0,0)")
        gradient.addColorStop(1, scrimColor)

        ctx.fillStyle = gradient
        ctx.fillRect(el.x, el.y, el.width, el.height)
        break
      }

      case "body": {
        if (!content.body) break

        if (el === expandTarget) {
          drawExpandedText(el, content.body, 1.1, 28, "500", 1.3, 3, resolveTextColor(el, brand, pageBackground, true))
          break
        }

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
        let fontSize = el.fontSize ?? 26
        ctx.font = `${el.fontWeight ?? "700"} ${fontSize}px ${fontFamily}`
        let paddingX = fontSize * 1.1

        // A long CTA could measure wider than the element's own max width —
        // previously the pill background was clamped to `el.width` but the
        // text itself was drawn at full size regardless, so it visibly
        // overflowed past the pill and into neighboring elements (confirmed
        // against real saved Post data during Phase 1C QA). Shrink the font
        // just enough that the pill can actually contain its own label.
        const naturalWidth = ctx.measureText(content.cta).width + paddingX * 2
        if (naturalWidth > el.width) {
          const scale = Math.max(0.6, el.width / naturalWidth)
          fontSize *= scale
          ctx.font = `${el.fontWeight ?? "700"} ${fontSize}px ${fontFamily}`
          paddingX = fontSize * 1.1
        }

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
        // A thin rule above the byline row — the real editorial device a
        // masthead/footer credit line uses to read as a deliberate,
        // structural part of the page rather than stray leftover text
        // (Phase 1C.6 QA feedback: "branding is too weak/subtle"). Full
        // element width, not just the logo+label's own measured width, so
        // it reads as a section divider.
        ctx.fillStyle = resolveTextColor(el, brand, pageBackground, true)
        ctx.globalAlpha = 0.35
        ctx.fillRect(el.x, el.y, el.width, 1)
        ctx.globalAlpha = 1

        let textX = el.x
        const contentY = el.y + el.height / 2 + 6

        if (logo) {
          const logoSize = el.height - 10
          const logoAspect = logo.width / logo.height
          const logoWidth = logoSize * logoAspect
          ctx.drawImage(logo, el.x, contentY - logoSize / 2, logoWidth, logoSize)
          textX = el.x + logoWidth + logoSize * 0.4
        }

        if (brandLabel) {
          const fontSize = el.fontSize ?? 22
          ctx.font = `${el.fontWeight ?? "700"} ${fontSize}px ${nodeFontFamily()}`
          // Full-strength (not muted) text and a touch of tracking — a
          // wordmark reads as intentional branding at this weight; the
          // previous muted/lighter treatment made it disappear entirely on
          // a quick glance, exactly the "too weak" complaint.
          ctx.fillStyle = resolveTextColor(el, brand, pageBackground, false)
          if ("letterSpacing" in ctx) ctx.letterSpacing = `${(fontSize * 0.02).toFixed(1)}px`
          ctx.textAlign = "left"
          ctx.textBaseline = "middle"
          ctx.fillText(brandLabel, textX, contentY)
          if ("letterSpacing" in ctx) ctx.letterSpacing = "0px"
        }
        break
      }
    }
  }
}
