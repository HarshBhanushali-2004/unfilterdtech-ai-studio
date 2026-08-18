import PptxGenJS from "pptxgenjs"

import type { BrandRenderProfile } from "@/lib/creative-renderer/types"
import {
  autoTextColor,
  isColorDark,
  resolveBackgroundColor,
  resolvePageBackground,
  resolveTextColor,
} from "@/lib/template-renderer/color-resolve"
import type { FormatLayout, FrameContent } from "@/lib/template-renderer/types"

/**
 * Builds a single-slide `.pptx` representing one Post — Phase 2's "Edit in
 * Canva" bridge (see CANVA_NEXT_PHASE_PLAN.md §4/§9). Walks the exact same
 * `FormatLayout.elements[]` array `render-frame.ts` walks, but targets
 * `pptxgenjs` shape/text/image calls instead of Canvas 2D draw calls — so a
 * headline/body/badge/CTA/logo/photo that's a separate `TemplateElement`
 * here becomes a separate, independently-editable object once Canva's
 * Design Import turns this file into a design (confirmed against Canva's
 * own documented native-PPTX-import behavior — see
 * CANVA_NEXT_PHASE_PLAN.md §2/§15; this module does not invent or assume
 * any Canva-specific PPTX behavior beyond what's documented there).
 *
 * Reuses `lib/template-renderer/color-resolve.ts` — extracted out of
 * `render-frame.ts` for exactly this reason — so `"auto"` /
 * `"brand-primary"` / `"brand-accent"` colors resolve identically to how
 * the AI-rendered PNG already resolves them; this builder is not a second,
 * independently-drifting copy of that logic.
 *
 * Deliberately narrower than `render-frame.ts` in a few documented ways
 * (see Known Limitations in CANVA_PHASE2_IMPLEMENTATION_REPORT.md):
 * - No `noMedia` expanded-text handling — Post's `mediaType` is always
 *   `IMAGE` or `VIDEO`, never `NO_MEDIA` (see `postPlanObjectSchema`), so
 *   every Post layout's `mediaFrame` always has something to place.
 * - The `scrim` gradient is approximated as a flat semi-transparent
 *   rectangle — `pptxgenjs` shape fills don't support multi-stop gradients.
 * - `category`/`cta` pills use the layout's own declared element width
 *   rather than dynamically measuring text (the Canvas renderer's
 *   `ctx.measureText` has no equivalent here) — Canva's own text
 *   auto-fit/wrap takes over once imported, same as it would for any
 *   other editable text box.
 * - Photo corners are not rounded — `pptxgenjs`'s `addImage` only supports
 *   a circular rounding, which would visually break a portrait-oriented
 *   photo; the image is placed as a plain rectangle instead.
 */

const PX_PER_INCH = 96
/** Canva/PowerPoint font sizes are in points; this renderer's `TemplateElement.fontSize` values are in canvas pixels at the same 96dpi assumption `pxToIn` uses below — 1px = 0.75pt at 96dpi. */
const PX_PER_PT = 96 / 72

function pxToIn(px: number): number {
  return px / PX_PER_INCH
}

function pxToPt(px: number): number {
  return px / PX_PER_PT
}

/** `pptxgenjs` wants hex colors without the leading `#`; every color this app produces is `#rrggbb`, but strip defensively in case a literal `rgba(...)` ever reaches here (falls back to a safe opaque near-black rather than passing an invalid value through). */
function toPptxColor(color: string): string {
  if (color.startsWith("#")) return color.slice(1)
  if (/^[0-9a-f]{6}$/i.test(color)) return color
  return "14151A"
}

export type PptxBuildInput = {
  layout: FormatLayout
  content: FrameContent
  /**
   * The raw, un-composited source image for the `mediaFrame` element, as a
   * `data:` URL — deliberately **not** the already-flattened
   * `PostMedia.renderedImageUrl`. Using the flattened render here would
   * bake the headline/body/badge back into the picture, defeating the
   * entire point of a structured import. Null when the plan's media
   * resolution never produced anything to show (results in a tinted
   * placeholder panel, mirroring `render-frame.ts`'s own fallback).
   */
  mediaDataUrl: string | null
  /** Brand Kit primary logo, as a `data:` URL. Null when there's no logo to show. */
  logoDataUrl: string | null
  brand: BrandRenderProfile
  brandLabel: string
}

/**
 * Draws one slide's worth of elements into an already-created `pptxgenjs`
 * slide — the shared per-slide logic behind both `buildPostPptx` (one
 * slide) and `buildCarouselPptx` (one call per `CarouselPlan` slide, in
 * order — see that function below). Extracted so a multi-slide Carousel
 * deck reuses the exact same element-drawing logic as Post, rather than a
 * second, drifting copy of it.
 */
function drawSlideElements(
  pptx: PptxGenJS,
  slide: ReturnType<PptxGenJS["addSlide"]>,
  layout: FormatLayout,
  content: FrameContent,
  mediaDataUrl: string | null,
  logoDataUrl: string | null,
  brand: BrandRenderProfile,
  brandLabel: string
): void {
  const pageBackground = resolvePageBackground(layout.background, brand)
  slide.background = { color: toPptxColor(pageBackground) }

  for (const el of layout.elements) {
    const x = pxToIn(el.x)
    const y = pxToIn(el.y)
    const w = pxToIn(el.width)
    const h = pxToIn(el.height)

    switch (el.type) {
      case "mediaFrame": {
        if (mediaDataUrl) {
          slide.addImage({
            data: mediaDataUrl,
            x,
            y,
            w,
            h,
            sizing: { type: "cover", w, h },
          })
        } else {
          // Mirrors render-frame.ts's tinted-placeholder fallback for a
          // resolved-but-undecodable asset.
          slide.addShape(pptx.ShapeType.roundRect, {
            x,
            y,
            w,
            h,
            rectRadius: pxToIn(el.borderRadius ?? 24),
            fill: { color: isColorDark(pageBackground) ? "FFFFFF" : "000000", transparency: 92 },
            line: { type: "none" },
          })
        }
        break
      }

      case "scrim": {
        // Flat semi-transparent rectangle — see the module doc comment for
        // why this doesn't reproduce the true top-to-bottom gradient.
        if (!content.headline && !content.body) break
        const scrimColor = el.color && el.color !== "auto" ? el.color : "#08090C"
        slide.addShape(pptx.ShapeType.rect, {
          x,
          y,
          w,
          h,
          fill: { color: toPptxColor(scrimColor), transparency: 25 },
          line: { type: "none" },
        })
        break
      }

      case "category": {
        if (!content.category) break
        const bg = resolveBackgroundColor(el.background, brand, pageBackground)
        if (bg) {
          slide.addShape(pptx.ShapeType.roundRect, {
            x,
            y,
            w,
            h,
            rectRadius: pxToIn(el.borderRadius ?? el.height / 2),
            fill: { color: toPptxColor(bg) },
            line: { type: "none" },
          })
        }
        slide.addText(content.category.toUpperCase(), {
          x,
          y,
          w,
          h,
          fontSize: pxToPt(el.fontSize ?? 24),
          bold: true,
          color: toPptxColor(resolveTextColor(el, brand, pageBackground, false)),
          fontFace: "Arial",
          align: "left",
          valign: "middle",
          margin: 6,
        })
        break
      }

      case "headline": {
        if (!content.headline) break
        slide.addText(content.headline, {
          x,
          y,
          w,
          h,
          fontSize: pxToPt(el.fontSize ?? 56),
          bold: true,
          color: toPptxColor(resolveTextColor(el, brand, pageBackground, false)),
          fontFace: "Arial",
          align: el.align ?? "left",
          valign: "top",
          lineSpacingMultiple: el.lineHeight ?? 1.1,
          wrap: true,
        })
        break
      }

      case "body": {
        if (!content.body) break
        slide.addText(content.body, {
          x,
          y,
          w,
          h,
          fontSize: pxToPt(el.fontSize ?? 28),
          color: toPptxColor(resolveTextColor(el, brand, pageBackground, true)),
          fontFace: "Arial",
          align: el.align ?? "left",
          valign: "top",
          lineSpacingMultiple: el.lineHeight ?? 1.3,
          wrap: true,
        })
        break
      }

      case "cta": {
        if (!content.cta) break
        const bg = resolveBackgroundColor(el.background, brand, pageBackground) ?? brand.accentColor
        slide.addShape(pptx.ShapeType.roundRect, {
          x,
          y,
          w,
          h,
          rectRadius: pxToIn(el.borderRadius ?? el.height / 2),
          fill: { color: toPptxColor(bg) },
          line: { type: "none" },
        })
        slide.addText(content.cta, {
          x,
          y,
          w,
          h,
          fontSize: pxToPt(el.fontSize ?? 26),
          bold: true,
          color: toPptxColor(autoTextColor(bg)),
          fontFace: "Arial",
          align: "center",
          valign: "middle",
        })
        break
      }

      case "branding": {
        let textX = x
        if (logoDataUrl) {
          const logoSize = h * 0.7
          slide.addImage({ data: logoDataUrl, x, y: y + (h - logoSize) / 2, w: logoSize, h: logoSize })
          textX = x + logoSize + pxToIn(16)
        }
        if (brandLabel) {
          slide.addText(brandLabel, {
            x: textX,
            y,
            w: Math.max(w - (textX - x), pxToIn(40)),
            h,
            fontSize: pxToPt(el.fontSize ?? 22),
            bold: true,
            color: toPptxColor(resolveTextColor(el, brand, pageBackground, false)),
            fontFace: "Arial",
            align: "left",
            valign: "middle",
          })
        }
        break
      }

      case "progress": {
        // Post has no page/slide counter (a single item, never a
        // sequence) — `FrameContent.progress` is never populated for that
        // format, so this is a no-op there. A Carousel slide's `content`
        // does set it ("3 / 6", pre-formatted exactly like `render-frame.ts`
        // expects — see `buildCarouselPptx` below).
        if (!content.progress) break
        slide.addText(content.progress, {
          x,
          y,
          w,
          h,
          fontSize: pxToPt(el.fontSize ?? 24),
          bold: true,
          color: toPptxColor(resolveTextColor(el, brand, pageBackground, true)),
          fontFace: "Arial",
          align: el.align ?? "right",
          valign: "middle",
        })
        break
      }
    }
  }
}

/** Builds a single-slide `.pptx` for a Post and returns it as a `Buffer`, ready to hand to Canva's Design Import API (`lib/canva/design-import.ts`). */
export async function buildPostPptx(input: PptxBuildInput): Promise<Buffer> {
  const { layout, content, mediaDataUrl, logoDataUrl, brand, brandLabel } = input

  const pptx = new PptxGenJS()
  const widthIn = pxToIn(layout.canvas.width)
  const heightIn = pxToIn(layout.canvas.height)
  pptx.defineLayout({ name: "UNFILTERDTECH_POST", width: widthIn, height: heightIn })
  pptx.layout = "UNFILTERDTECH_POST"

  const slide = pptx.addSlide()
  drawSlideElements(pptx, slide, layout, content, mediaDataUrl, logoDataUrl, brand, brandLabel)

  const buffer = await pptx.write({ outputType: "nodebuffer" })
  return buffer as Buffer
}

export type CarouselPptxSlideInput = {
  layout: FormatLayout
  content: FrameContent
  mediaDataUrl: string | null
}

export type CarouselPptxBuildInput = {
  /** One entry per `CarouselPlan` slide, in `slideOrder`. Every slide shares the same canvas size (`slides[0].layout.canvas`), matching how `generateMediaForCarouselPlan` renders them — Canva Design Import needs one uniform page size for the whole deck, not a per-slide one. */
  slides: CarouselPptxSlideInput[]
  logoDataUrl: string | null
  brand: BrandRenderProfile
  brandLabel: string
}

/**
 * Builds a multi-slide `.pptx` for a Carousel — one PPTX slide per
 * `CarouselPlan` slide, in order, each drawn with the exact same
 * `drawSlideElements` logic `buildPostPptx` uses. This is what lets Canva's
 * Design Import produce a single multi-page design that preserves the
 * carousel's slide structure (CANVA_NEXT_PHASE_PLAN.md §2's confirmed
 * "one PPTX slide = one Canva page" behavior), rather than N separate,
 * disconnected Canva designs.
 */
export async function buildCarouselPptx(input: CarouselPptxBuildInput): Promise<Buffer> {
  const { slides, logoDataUrl, brand, brandLabel } = input

  if (slides.length === 0) {
    throw new Error("buildCarouselPptx requires at least one slide.")
  }

  const pptx = new PptxGenJS()
  const { width, height } = slides[0].layout.canvas
  pptx.defineLayout({ name: "UNFILTERDTECH_CAROUSEL", width: pxToIn(width), height: pxToIn(height) })
  pptx.layout = "UNFILTERDTECH_CAROUSEL"

  for (const { layout, content, mediaDataUrl } of slides) {
    const slide = pptx.addSlide()
    drawSlideElements(pptx, slide, layout, content, mediaDataUrl, logoDataUrl, brand, brandLabel)
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" })
  return buffer as Buffer
}
