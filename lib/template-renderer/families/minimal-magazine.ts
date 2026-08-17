import type { FormatCompositions, TemplateElement, TemplateFamily } from "../types"

/**
 * "Minimal Magazine" — a light, crisp, print-inspired editorial identity:
 * fixed neutral paper background (independent of Brand Kit's primary color,
 * unlike "Editorial Tech" — many real print-style templates use a
 * deliberately fixed canvas tone rather than a brand-derived one), sharp
 * corners, lighter headline weight, plain-text category labels (no pill),
 * softer neutral borders. Built from the same three shared compositions
 * (plus carousel-only `numbered-editorial`) as Editorial Tech — see that
 * file's doc comment for the Phase 1C.5 rationale — but every choice below
 * is deliberately its own, not Editorial Tech recolored: different corner
 * radii, different type weights, a plain-text category treatment instead of
 * a badge, and a fixed soft-grey border instead of a brand-derived one.
 */
const PAPER_BACKGROUND = "#FAFAF8"
const BORDER_COLOR = "#D9D6CE"

// Full-bleed compositions place text over a photo+scrim regardless of the
// family's own paper background — see Editorial Tech's identical rationale.
const ON_IMAGE_HEADLINE = "#FFFFFF"
const ON_IMAGE_BODY = "rgba(255,255,255,0.85)"
const ON_IMAGE_BRAND = "rgba(255,255,255,0.9)"

function brandingRow(y: number): TemplateElement {
  return { id: "branding", type: "branding", x: 64, y, width: 952, height: 40, fontSize: 20, fontWeight: "500", align: "left", color: "auto" }
}

function brandingRowOnImage(y: number): TemplateElement {
  return { id: "branding", type: "branding", x: 64, y, width: 952, height: 40, fontSize: 20, fontWeight: "500", align: "left", color: ON_IMAGE_BRAND }
}

/** No pill background — a restrained uppercase label, the identity choice that most visibly separates this family from Editorial Tech's accent-pill badges. */
function categoryLabel(y: number): TemplateElement {
  return { id: "category", type: "category", x: 64, y, width: 420, height: 44, fontSize: 20, fontWeight: "700", align: "left", color: "auto", background: "transparent" }
}

function categoryLabelOnImage(y: number): TemplateElement {
  return { id: "category", type: "category", x: 64, y, width: 420, height: 44, fontSize: 20, fontWeight: "700", align: "left", color: ON_IMAGE_HEADLINE, background: "rgba(0,0,0,0.28)", borderRadius: 4 }
}

function progressMarker(x: number, y: number, width: number, onImage: boolean): TemplateElement {
  return { id: "progress", type: "progress", x, y, width, height: 44, fontSize: 20, fontWeight: "600", align: "right", color: onImage ? ON_IMAGE_BRAND : "auto", background: "transparent" }
}

// ============================================================================
// POST + CAROUSEL — 1080×1350
// ============================================================================

function heroFullBleedSquare(withProgress: boolean): TemplateElement[] {
  return [
    { id: "mediaFrame", type: "mediaFrame", x: 0, y: 0, width: 1080, height: 1350, borderRadius: 0 },
    { id: "scrim", type: "scrim", x: 0, y: 630, width: 1080, height: 720, scrimDirection: "to-bottom", color: "rgba(18,18,16,0.74)" },
    categoryLabelOnImage(64),
    ...(withProgress ? [progressMarker(636, 64, 380, true)] : []),
    { id: "headline", type: "headline", x: 64, y: 1000, width: 952, height: 200, fontSize: 52, fontWeight: "600", lineHeight: 1.14, maxLines: 3, align: "left", color: ON_IMAGE_HEADLINE },
    { id: "body", type: "body", x: 64, y: 1206, width: 952, height: 56, fontSize: 24, fontWeight: "400", lineHeight: 1.35, maxLines: 2, align: "left", color: ON_IMAGE_BODY },
    brandingRowOnImage(1284),
  ]
}

function textFirstSquare(withProgress: boolean, withCta: boolean): TemplateElement[] {
  const elements: TemplateElement[] = [
    categoryLabel(64),
    ...(withProgress ? [progressMarker(636, 64, 380, false)] : []),
    { id: "headline", type: "headline", x: 64, y: 132, width: 952, height: 210, fontSize: 48, fontWeight: "600", lineHeight: 1.16, maxLines: 3, align: "left", color: "auto" },
    { id: "body", type: "body", x: 64, y: 358, width: 952, height: 140, fontSize: 26, fontWeight: "400", lineHeight: 1.4, maxLines: 4, align: "left", color: "auto" },
    { id: "mediaFrame", type: "mediaFrame", x: 64, y: 520, width: 952, height: 630, borderRadius: 4, borderWidth: 1, borderColor: BORDER_COLOR },
  ]
  if (withCta) elements.push({ id: "cta", type: "cta", x: 64, y: 1186, width: 300, height: 54, fontSize: 22, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 4 })
  elements.push(brandingRow(withCta ? 1270 : 1190))
  return elements
}

function framedEditorialSquare(withProgress: boolean): TemplateElement[] {
  return [
    categoryLabel(64),
    ...(withProgress ? [progressMarker(636, 64, 380, false)] : []),
    { id: "mediaFrame", type: "mediaFrame", x: 64, y: 132, width: 952, height: 660, borderRadius: 4, borderWidth: 1, borderColor: BORDER_COLOR },
    { id: "headline", type: "headline", x: 64, y: 828, width: 952, height: 160, fontSize: 46, fontWeight: "600", lineHeight: 1.16, maxLines: 3, align: "left", color: "auto" },
    { id: "body", type: "body", x: 64, y: 998, width: 952, height: 60, fontSize: 26, fontWeight: "400", lineHeight: 1.35, maxLines: 2, align: "left", color: "auto" },
    { id: "cta", type: "cta", x: 64, y: 1082, width: 320, height: 56, fontSize: 22, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 4 },
    brandingRow(1180),
  ]
}

/** Carousel-only — a light-weight display numeral (a magazine pull-quote treatment) rather than Editorial Tech's bold accent-colored one; the typographic weight/color choice, not just the value, is what makes this feel like a distinct family. */
function numberedEditorialCarousel(): TemplateElement[] {
  return [
    { id: "progress", type: "progress", x: 64, y: 48, width: 480, height: 150, fontSize: 108, fontWeight: "300", align: "left", color: "auto", background: "transparent" },
    categoryLabel(212),
    { id: "headline", type: "headline", x: 64, y: 268, width: 952, height: 170, fontSize: 40, fontWeight: "600", lineHeight: 1.18, maxLines: 3, align: "left", color: "auto" },
    { id: "mediaFrame", type: "mediaFrame", x: 64, y: 456, width: 952, height: 570, borderRadius: 4, borderWidth: 1, borderColor: BORDER_COLOR },
    { id: "body", type: "body", x: 64, y: 1052, width: 952, height: 76, fontSize: 22, fontWeight: "400", lineHeight: 1.35, maxLines: 2, align: "left", color: "auto" },
    brandingRow(1176),
  ]
}

const postCompositions: FormatCompositions = {
  "hero-full-bleed": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: heroFullBleedSquare(false) },
  "text-first": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: textFirstSquare(false, true) },
  "framed-editorial": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: framedEditorialSquare(false) },
}

const carouselCompositions: FormatCompositions = {
  "hero-full-bleed": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: heroFullBleedSquare(true) },
  "text-first": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: textFirstSquare(true, true) },
  "framed-editorial": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: framedEditorialSquare(true) },
  "numbered-editorial": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: numberedEditorialCarousel() },
}

// ============================================================================
// STORY + REEL — 1080×1920, same Instagram-style safe zones as Editorial Tech
// ============================================================================

function heroFullBleedVertical(): TemplateElement[] {
  return [
    { id: "mediaFrame", type: "mediaFrame", x: 0, y: 0, width: 1080, height: 1920, borderRadius: 0 },
    { id: "scrim", type: "scrim", x: 0, y: 1200, width: 1080, height: 720, scrimDirection: "to-bottom", color: "rgba(18,18,16,0.74)" },
    categoryLabelOnImage(180),
    progressMarker(636, 180, 380, true),
    { id: "headline", type: "headline", x: 64, y: 1444, width: 952, height: 220, fontSize: 44, fontWeight: "600", lineHeight: 1.18, maxLines: 4, align: "left", color: ON_IMAGE_HEADLINE },
    { id: "cta", type: "cta", x: 64, y: 1696, width: 320, height: 56, fontSize: 22, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 4 },
  ]
}

function framedEditorialVertical(): TemplateElement[] {
  return [
    categoryLabel(180),
    progressMarker(636, 180, 380, false),
    { id: "mediaFrame", type: "mediaFrame", x: 40, y: 248, width: 1000, height: 990, borderRadius: 6, borderWidth: 1, borderColor: BORDER_COLOR },
    { id: "headline", type: "headline", x: 64, y: 1266, width: 952, height: 170, fontSize: 40, fontWeight: "600", lineHeight: 1.18, maxLines: 3, align: "left", color: "auto" },
    { id: "cta", type: "cta", x: 64, y: 1460, width: 320, height: 56, fontSize: 22, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 4 },
    brandingRow(1548),
  ]
}

function textFirstVertical(): TemplateElement[] {
  return [
    categoryLabel(180),
    progressMarker(636, 180, 380, false),
    { id: "headline", type: "headline", x: 64, y: 264, width: 952, height: 250, fontSize: 46, fontWeight: "600", lineHeight: 1.16, maxLines: 4, align: "left", color: "auto" },
    { id: "body", type: "body", x: 64, y: 536, width: 952, height: 150, fontSize: 26, fontWeight: "400", lineHeight: 1.4, maxLines: 4, align: "left", color: "auto" },
    { id: "mediaFrame", type: "mediaFrame", x: 64, y: 712, width: 952, height: 720, borderRadius: 4, borderWidth: 1, borderColor: BORDER_COLOR },
    { id: "cta", type: "cta", x: 64, y: 1468, width: 320, height: 56, fontSize: 22, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 4 },
    brandingRow(1556),
  ]
}

const storyCompositions: FormatCompositions = {
  "hero-full-bleed": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: heroFullBleedVertical() },
  "framed-editorial": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: framedEditorialVertical() },
  "text-first": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: textFirstVertical() },
}

function reelElements(base: TemplateElement[]): TemplateElement[] {
  return base.filter((el) => el.type !== "body")
}

const reelCompositions: FormatCompositions = {
  "hero-full-bleed": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: reelElements(heroFullBleedVertical()) },
  "framed-editorial": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: reelElements(framedEditorialVertical()) },
  "text-first": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: PAPER_BACKGROUND }, elements: reelElements(textFirstVertical()) },
}

export const MINIMAL_MAGAZINE: TemplateFamily = {
  id: "minimal-magazine",
  name: "Minimal Magazine",
  description: "Light, crisp, print-inspired editorial design — sharp corners, restrained typography, generous whitespace.",
  formats: {
    post: postCompositions,
    carousel: carouselCompositions,
    story: storyCompositions,
    reel: reelCompositions,
  },
}
