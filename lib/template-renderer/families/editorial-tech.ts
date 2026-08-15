import type { TemplateFamily } from "../types"

/**
 * "Editorial Tech" — Phase 1B's original carousel design (dark, bold,
 * brand-accent category pills, large contained media frame), now
 * generalized into a full `TemplateFamily` covering all four formats. The
 * `carousel` layout below is pixel-identical to Phase 1B's
 * `EDITORIAL_CAROUSEL_TEMPLATE` — existing carousel creations render
 * unchanged (Phase 1C backward-compatibility requirement).
 */
export const EDITORIAL_TECH: TemplateFamily = {
  id: "editorial-tech",
  name: "Editorial Tech",
  description: "Bold, dark, tech-forward editorial design — strong headlines, a contained media frame, brand-accent badges.",
  formats: {
    carousel: {
      canvas: { width: 1080, height: 1350 },
      background: { type: "solid", color: "auto" },
      elements: [
        { id: "category", type: "category", x: 64, y: 64, width: 420, height: 52, fontSize: 24, fontWeight: "700", align: "left", color: "auto", background: "brand-accent", borderRadius: 26 },
        { id: "progress", type: "progress", x: 636, y: 64, width: 380, height: 52, fontSize: 24, fontWeight: "600", align: "right", color: "auto", background: "transparent" },
        { id: "headline", type: "headline", x: 64, y: 148, width: 952, height: 220, fontSize: 64, fontWeight: "700", lineHeight: 1.08, maxLines: 3, align: "left", color: "auto" },
        { id: "mediaFrame", type: "mediaFrame", x: 64, y: 388, width: 952, height: 616, borderRadius: 28 },
        { id: "body", type: "body", x: 64, y: 1034, width: 952, height: 140, fontSize: 30, fontWeight: "500", lineHeight: 1.3, maxLines: 3, align: "left", color: "auto" },
        { id: "cta", type: "cta", x: 64, y: 1190, width: 360, height: 64, fontSize: 26, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 32 },
        { id: "branding", type: "branding", x: 64, y: 1272, width: 952, height: 40, fontSize: 22, fontWeight: "600", align: "left", color: "auto" },
      ],
    },
    // A single post is media-forward — one hero image/generated visual with
    // a compact headline/body beneath it, no progress indicator (there's
    // only one "slide").
    post: {
      canvas: { width: 1080, height: 1350 },
      background: { type: "solid", color: "auto" },
      elements: [
        { id: "category", type: "category", x: 64, y: 64, width: 420, height: 52, fontSize: 24, fontWeight: "700", align: "left", color: "auto", background: "brand-accent", borderRadius: 26 },
        { id: "mediaFrame", type: "mediaFrame", x: 64, y: 140, width: 952, height: 760, borderRadius: 28 },
        { id: "headline", type: "headline", x: 64, y: 924, width: 952, height: 130, fontSize: 44, fontWeight: "700", lineHeight: 1.12, maxLines: 2, align: "left", color: "auto" },
        { id: "body", type: "body", x: 64, y: 1058, width: 952, height: 80, fontSize: 24, fontWeight: "500", lineHeight: 1.3, maxLines: 2, align: "left", color: "auto" },
        { id: "cta", type: "cta", x: 64, y: 1150, width: 320, height: 56, fontSize: 22, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 28 },
        { id: "branding", type: "branding", x: 64, y: 1234, width: 952, height: 40, fontSize: 22, fontWeight: "600", align: "left", color: "auto" },
      ],
    },
    // 9:16 — Instagram Story safe zones respected: nothing critical sits in
    // the top ~180px (profile/close controls) or below ~1700px (reply bar).
    story: {
      canvas: { width: 1080, height: 1920 },
      background: { type: "solid", color: "auto" },
      elements: [
        { id: "category", type: "category", x: 64, y: 180, width: 420, height: 52, fontSize: 24, fontWeight: "700", align: "left", color: "auto", background: "brand-accent", borderRadius: 26 },
        { id: "progress", type: "progress", x: 636, y: 180, width: 380, height: 52, fontSize: 24, fontWeight: "600", align: "right", color: "auto", background: "transparent" },
        { id: "mediaFrame", type: "mediaFrame", x: 40, y: 260, width: 1000, height: 1000, borderRadius: 32 },
        { id: "headline", type: "headline", x: 64, y: 1284, width: 952, height: 130, fontSize: 46, fontWeight: "700", lineHeight: 1.12, maxLines: 3, align: "left", color: "auto" },
        { id: "body", type: "body", x: 64, y: 1424, width: 952, height: 90, fontSize: 26, fontWeight: "500", lineHeight: 1.3, maxLines: 2, align: "left", color: "auto" },
        { id: "cta", type: "cta", x: 64, y: 1534, width: 340, height: 60, fontSize: 24, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 30 },
        { id: "branding", type: "branding", x: 64, y: 1614, width: 952, height: 40, fontSize: 22, fontWeight: "600", align: "left", color: "auto" },
      ],
    },
    // Reel scenes render as a static storyboard preview (no video
    // composition in Phase 1C — see lib/reel-plan/). Simpler text than
    // Story: a scene-purpose category label and a short on-screen-caption
    // headline, no body/CTA (most scenes carry neither).
    reel: {
      canvas: { width: 1080, height: 1920 },
      background: { type: "solid", color: "auto" },
      elements: [
        { id: "category", type: "category", x: 64, y: 180, width: 500, height: 52, fontSize: 24, fontWeight: "700", align: "left", color: "auto", background: "brand-accent", borderRadius: 26 },
        { id: "progress", type: "progress", x: 616, y: 180, width: 400, height: 52, fontSize: 24, fontWeight: "600", align: "right", color: "auto", background: "transparent" },
        { id: "mediaFrame", type: "mediaFrame", x: 40, y: 260, width: 1000, height: 1100, borderRadius: 32 },
        { id: "headline", type: "headline", x: 64, y: 1384, width: 952, height: 140, fontSize: 40, fontWeight: "700", lineHeight: 1.15, maxLines: 3, align: "left", color: "auto" },
        { id: "cta", type: "cta", x: 64, y: 1544, width: 340, height: 60, fontSize: 24, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 30 },
        { id: "branding", type: "branding", x: 64, y: 1624, width: 952, height: 40, fontSize: 22, fontWeight: "600", align: "left", color: "auto" },
      ],
    },
  },
}
