import type { FormatCompositions, TemplateElement, TemplateFamily } from "../types"

/**
 * "Editorial Tech" — a bold, dark, tech-forward editorial identity built
 * from three shared compositions (plus a carousel-only fourth) rather than
 * one fixed per-format box-stack. Phase 1C.5 (AGENTS.md's "Reference-Based
 * Visual Quality" upgrade) replaced the single rigid
 * category→headline→boxed-image→body→CTA→branding layout every format used
 * with real, content-selected variety — modeled on real tech/robotics
 * Instagram accounts (full-bleed hero photography with overlaid headlines,
 * a framed/inset photo treatment, and a text-led explainer layout) rather
 * than a generic template-card look. `composition-selector.ts` decides
 * which of these an item renders as; nothing here is user-facing.
 */

// ---- Shared text treatment for elements sitting over a full-bleed photo ---
// "auto" text color resolves against the *flat page background*, not
// whatever a photo+scrim actually looks like underneath — see
// `TemplateElement.color`'s doc comment — so every full-bleed composition
// below uses these literal light colors instead of "auto".
const ON_IMAGE_HEADLINE = "#FFFFFF"
const ON_IMAGE_BODY = "rgba(255,255,255,0.82)"
const ON_IMAGE_BRAND = "rgba(255,255,255,0.88)"

function brandingRow(y: number): TemplateElement {
  return { id: "branding", type: "branding", x: 64, y, width: 952, height: 40, fontSize: 22, fontWeight: "600", align: "left", color: "auto" }
}

function brandingRowOnImage(y: number): TemplateElement {
  return { id: "branding", type: "branding", x: 64, y, width: 952, height: 40, fontSize: 22, fontWeight: "600", align: "left", color: ON_IMAGE_BRAND }
}

function categoryPill(y: number): TemplateElement {
  return { id: "category", type: "category", x: 64, y, width: 420, height: 52, fontSize: 24, fontWeight: "700", align: "left", color: "auto", background: "brand-accent", borderRadius: 26 }
}

function progressMarker(x: number, y: number, width: number): TemplateElement {
  return { id: "progress", type: "progress", x, y, width, height: 52, fontSize: 24, fontWeight: "600", align: "right", color: ON_IMAGE_BRAND, background: "transparent" }
}

// ============================================================================
// POST + CAROUSEL share a 1080×1350 canvas and near-identical compositions —
// the only difference is Carousel adds a `progress` marker and (for
// numbered-editorial) leans harder into it. Built as functions so the two
// formats stay in lockstep without hand-duplicating coordinates.
// ============================================================================

function heroFullBleedSquare(withProgress: boolean): TemplateElement[] {
  return [
    { id: "mediaFrame", type: "mediaFrame", x: 0, y: 0, width: 1080, height: 1350, borderRadius: 0 },
    { id: "scrim", type: "scrim", x: 0, y: 610, width: 1080, height: 740, scrimDirection: "to-bottom" },
    categoryPill(64),
    ...(withProgress ? [progressMarker(636, 64, 380)] : []),
    { id: "headline", type: "headline", x: 64, y: 992, width: 952, height: 210, fontSize: 58, fontWeight: "800", lineHeight: 1.08, maxLines: 3, align: "left", color: ON_IMAGE_HEADLINE },
    { id: "body", type: "body", x: 64, y: 1208, width: 952, height: 56, fontSize: 26, fontWeight: "500", lineHeight: 1.3, maxLines: 2, align: "left", color: ON_IMAGE_BODY },
    brandingRowOnImage(1284),
  ]
}

function textFirstSquare(withProgress: boolean, withCta: boolean): TemplateElement[] {
  const elements: TemplateElement[] = [
    categoryPill(64),
    ...(withProgress ? [progressMarker(636, 64, 380)] : []),
    { id: "headline", type: "headline", x: 64, y: 148, width: 952, height: 220, fontSize: 54, fontWeight: "800", lineHeight: 1.1, maxLines: 3, align: "left", color: "auto" },
    { id: "body", type: "body", x: 64, y: 384, width: 952, height: 140, fontSize: 28, fontWeight: "400", lineHeight: 1.35, maxLines: 4, align: "left", color: "auto" },
    { id: "mediaFrame", type: "mediaFrame", x: 64, y: 552, width: 952, height: 610, borderRadius: 18, borderWidth: 2, borderColor: "auto" },
  ]
  if (withCta) elements.push({ id: "cta", type: "cta", x: 64, y: 1194, width: 340, height: 58, fontSize: 24, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 29 })
  elements.push(brandingRow(withCta ? 1276 : 1206))
  return elements
}

function framedEditorialSquare(withProgress: boolean): TemplateElement[] {
  return [
    categoryPill(64),
    ...(withProgress ? [progressMarker(636, 64, 380)] : []),
    { id: "mediaFrame", type: "mediaFrame", x: 64, y: 148, width: 952, height: 640, borderRadius: 24, borderWidth: 2, borderColor: "auto" },
    { id: "headline", type: "headline", x: 64, y: 824, width: 952, height: 170, fontSize: 52, fontWeight: "800", lineHeight: 1.1, maxLines: 3, align: "left", color: "auto" },
    { id: "body", type: "body", x: 64, y: 1004, width: 952, height: 64, fontSize: 28, fontWeight: "500", lineHeight: 1.3, maxLines: 2, align: "left", color: "auto" },
    { id: "cta", type: "cta", x: 64, y: 1088, width: 360, height: 60, fontSize: 25, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 30 },
    brandingRow(1188),
  ]
}

/** Carousel-only — see `CompositionId`'s doc comment. A big typographic progress marker as the visual anchor, giving mid-carousel slides a different rhythm than `framed-editorial` without needing new content fields. */
function numberedEditorialCarousel(): TemplateElement[] {
  return [
    { id: "progress", type: "progress", x: 64, y: 56, width: 480, height: 140, fontSize: 100, fontWeight: "800", align: "left", color: "brand-accent", background: "transparent" },
    { id: "category", type: "category", x: 64, y: 220, width: 340, height: 44, fontSize: 20, fontWeight: "700", align: "left", color: "auto", background: "transparent" },
    { id: "headline", type: "headline", x: 64, y: 280, width: 952, height: 170, fontSize: 44, fontWeight: "800", lineHeight: 1.12, maxLines: 3, align: "left", color: "auto" },
    { id: "mediaFrame", type: "mediaFrame", x: 64, y: 472, width: 952, height: 560, borderRadius: 20, borderWidth: 2, borderColor: "auto" },
    { id: "body", type: "body", x: 64, y: 1058, width: 952, height: 76, fontSize: 24, fontWeight: "500", lineHeight: 1.3, maxLines: 2, align: "left", color: "auto" },
    brandingRow(1180),
  ]
}

const postCompositions: FormatCompositions = {
  "hero-full-bleed": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: "auto" }, elements: heroFullBleedSquare(false) },
  "text-first": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: "auto" }, elements: textFirstSquare(false, true) },
  "framed-editorial": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: "auto" }, elements: framedEditorialSquare(false) },
}

const carouselCompositions: FormatCompositions = {
  "hero-full-bleed": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: "auto" }, elements: heroFullBleedSquare(true) },
  "text-first": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: "auto" }, elements: textFirstSquare(true, true) },
  "framed-editorial": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: "auto" }, elements: framedEditorialSquare(true) },
  "numbered-editorial": { canvas: { width: 1080, height: 1350 }, background: { type: "solid", color: "auto" }, elements: numberedEditorialCarousel() },
}

// ============================================================================
// STORY + REEL share a 1080×1920 vertical canvas — Instagram-style safe
// zones respected: nothing critical sits in the top ~180px (profile/close
// controls) or below ~1720px (reply bar / scene controls).
// ============================================================================

function heroFullBleedVertical(): TemplateElement[] {
  return [
    { id: "mediaFrame", type: "mediaFrame", x: 0, y: 0, width: 1080, height: 1920, borderRadius: 0 },
    { id: "scrim", type: "scrim", x: 0, y: 1180, width: 1080, height: 740, scrimDirection: "to-bottom" },
    { id: "scrim-top", type: "scrim", x: 0, y: 0, width: 1080, height: 260, scrimDirection: "to-top" },
    { id: "category", type: "category", x: 64, y: 180, width: 420, height: 52, fontSize: 24, fontWeight: "700", align: "left", color: "auto", background: "brand-accent", borderRadius: 26 },
    progressMarker(636, 180, 380),
    { id: "headline", type: "headline", x: 64, y: 1436, width: 952, height: 230, fontSize: 50, fontWeight: "800", lineHeight: 1.14, maxLines: 4, align: "left", color: ON_IMAGE_HEADLINE },
    { id: "cta", type: "cta", x: 64, y: 1696, width: 360, height: 60, fontSize: 24, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 30 },
  ]
}

function framedEditorialVertical(): TemplateElement[] {
  return [
    { id: "category", type: "category", x: 64, y: 180, width: 420, height: 52, fontSize: 24, fontWeight: "700", align: "left", color: "auto", background: "brand-accent", borderRadius: 26 },
    progressMarker(636, 180, 380),
    { id: "mediaFrame", type: "mediaFrame", x: 40, y: 260, width: 1000, height: 980, borderRadius: 28, borderWidth: 2, borderColor: "auto" },
    { id: "headline", type: "headline", x: 64, y: 1272, width: 952, height: 170, fontSize: 44, fontWeight: "800", lineHeight: 1.14, maxLines: 3, align: "left", color: "auto" },
    { id: "cta", type: "cta", x: 64, y: 1466, width: 360, height: 60, fontSize: 24, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 30 },
    brandingRow(1554),
  ]
}

function textFirstVertical(): TemplateElement[] {
  return [
    { id: "category", type: "category", x: 64, y: 180, width: 420, height: 52, fontSize: 24, fontWeight: "700", align: "left", color: "auto", background: "brand-accent", borderRadius: 26 },
    progressMarker(636, 180, 380),
    { id: "headline", type: "headline", x: 64, y: 272, width: 952, height: 260, fontSize: 52, fontWeight: "800", lineHeight: 1.12, maxLines: 4, align: "left", color: "auto" },
    { id: "body", type: "body", x: 64, y: 556, width: 952, height: 150, fontSize: 28, fontWeight: "400", lineHeight: 1.35, maxLines: 4, align: "left", color: "auto" },
    { id: "mediaFrame", type: "mediaFrame", x: 64, y: 736, width: 952, height: 700, borderRadius: 18, borderWidth: 2, borderColor: "auto" },
    { id: "cta", type: "cta", x: 64, y: 1476, width: 360, height: 60, fontSize: 24, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 30 },
    brandingRow(1564),
  ]
}

const storyCompositions: FormatCompositions = {
  "hero-full-bleed": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: "auto" }, elements: heroFullBleedVertical() },
  "framed-editorial": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: "auto" }, elements: framedEditorialVertical() },
  "text-first": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: "auto" }, elements: textFirstVertical() },
}

// Reel scenes render as a static storyboard preview (no video composition
// in Phase 1C — see lib/reel-plan/). Same vertical compositions as Story,
// minus body copy (a scene's on-screen text is its whole caption — see
// `FrameContent`'s doc comment and reel-plan's `onScreenText` mapping).
function reelElements(base: TemplateElement[]): TemplateElement[] {
  return base.filter((el) => el.type !== "body")
}

const reelCompositions: FormatCompositions = {
  "hero-full-bleed": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: "auto" }, elements: reelElements(heroFullBleedVertical()) },
  "framed-editorial": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: "auto" }, elements: reelElements(framedEditorialVertical()) },
  "text-first": { canvas: { width: 1080, height: 1920 }, background: { type: "solid", color: "auto" }, elements: reelElements(textFirstVertical()) },
}

export const EDITORIAL_TECH: TemplateFamily = {
  id: "editorial-tech",
  name: "Editorial Tech",
  description: "Bold, dark, tech-forward editorial design — full-bleed photography, strong headlines, brand-accent badges.",
  formats: {
    post: postCompositions,
    carousel: carouselCompositions,
    story: storyCompositions,
    reel: reelCompositions,
  },
}
