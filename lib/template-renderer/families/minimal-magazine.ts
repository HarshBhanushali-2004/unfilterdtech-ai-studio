import type { TemplateFamily } from "../types"

/**
 * "Minimal Magazine" — a light, crisp, editorial-print-inspired identity:
 * fixed neutral paper background (independent of Brand Kit's primary color,
 * unlike "Editorial Tech" — many real print-style templates use a
 * deliberately fixed canvas tone rather than a brand-derived one), sharper
 * corners, lighter headline weight. Still uses the Brand Kit's accent color
 * for badges/CTA, so it stays on-brand while looking structurally distinct
 * from Editorial Tech — proving the registry supports genuinely different
 * visual identities, not just recolors of one layout.
 */
const PAPER_BACKGROUND = "#FAFAF8"

export const MINIMAL_MAGAZINE: TemplateFamily = {
  id: "minimal-magazine",
  name: "Minimal Magazine",
  description: "Light, crisp, print-inspired editorial design — sharp corners, restrained typography, generous whitespace.",
  formats: {
    carousel: {
      canvas: { width: 1080, height: 1350 },
      background: { type: "solid", color: PAPER_BACKGROUND },
      elements: [
        { id: "category", type: "category", x: 64, y: 64, width: 420, height: 44, fontSize: 20, fontWeight: "700", align: "left", color: "auto", background: "transparent" },
        { id: "progress", type: "progress", x: 636, y: 64, width: 380, height: 44, fontSize: 20, fontWeight: "600", align: "right", color: "auto", background: "transparent" },
        { id: "headline", type: "headline", x: 64, y: 140, width: 952, height: 200, fontSize: 56, fontWeight: "600", lineHeight: 1.14, maxLines: 3, align: "left", color: "auto" },
        { id: "mediaFrame", type: "mediaFrame", x: 64, y: 372, width: 952, height: 616, borderRadius: 4 },
        { id: "body", type: "body", x: 64, y: 1018, width: 952, height: 140, fontSize: 28, fontWeight: "400", lineHeight: 1.35, maxLines: 3, align: "left", color: "auto" },
        { id: "cta", type: "cta", x: 64, y: 1190, width: 340, height: 60, fontSize: 24, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 4 },
        { id: "branding", type: "branding", x: 64, y: 1272, width: 952, height: 40, fontSize: 20, fontWeight: "500", align: "left", color: "auto" },
      ],
    },
    post: {
      canvas: { width: 1080, height: 1350 },
      background: { type: "solid", color: PAPER_BACKGROUND },
      elements: [
        { id: "category", type: "category", x: 64, y: 64, width: 420, height: 44, fontSize: 20, fontWeight: "700", align: "left", color: "auto", background: "transparent" },
        { id: "mediaFrame", type: "mediaFrame", x: 64, y: 132, width: 952, height: 760, borderRadius: 4 },
        { id: "headline", type: "headline", x: 64, y: 916, width: 952, height: 120, fontSize: 40, fontWeight: "600", lineHeight: 1.16, maxLines: 2, align: "left", color: "auto" },
        { id: "body", type: "body", x: 64, y: 1044, width: 952, height: 80, fontSize: 22, fontWeight: "400", lineHeight: 1.35, maxLines: 2, align: "left", color: "auto" },
        { id: "cta", type: "cta", x: 64, y: 1146, width: 300, height: 52, fontSize: 20, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 4 },
        { id: "branding", type: "branding", x: 64, y: 1234, width: 952, height: 40, fontSize: 20, fontWeight: "500", align: "left", color: "auto" },
      ],
    },
    story: {
      canvas: { width: 1080, height: 1920 },
      background: { type: "solid", color: PAPER_BACKGROUND },
      elements: [
        { id: "category", type: "category", x: 64, y: 180, width: 420, height: 44, fontSize: 20, fontWeight: "700", align: "left", color: "auto", background: "transparent" },
        { id: "progress", type: "progress", x: 636, y: 180, width: 380, height: 44, fontSize: 20, fontWeight: "600", align: "right", color: "auto", background: "transparent" },
        { id: "mediaFrame", type: "mediaFrame", x: 40, y: 252, width: 1000, height: 1000, borderRadius: 6 },
        { id: "headline", type: "headline", x: 64, y: 1276, width: 952, height: 130, fontSize: 42, fontWeight: "600", lineHeight: 1.16, maxLines: 3, align: "left", color: "auto" },
        { id: "body", type: "body", x: 64, y: 1416, width: 952, height: 90, fontSize: 24, fontWeight: "400", lineHeight: 1.35, maxLines: 2, align: "left", color: "auto" },
        { id: "cta", type: "cta", x: 64, y: 1526, width: 320, height: 56, fontSize: 22, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 4 },
        { id: "branding", type: "branding", x: 64, y: 1610, width: 952, height: 40, fontSize: 20, fontWeight: "500", align: "left", color: "auto" },
      ],
    },
    reel: {
      canvas: { width: 1080, height: 1920 },
      background: { type: "solid", color: PAPER_BACKGROUND },
      elements: [
        { id: "category", type: "category", x: 64, y: 180, width: 500, height: 44, fontSize: 20, fontWeight: "700", align: "left", color: "auto", background: "transparent" },
        { id: "progress", type: "progress", x: 616, y: 180, width: 400, height: 44, fontSize: 20, fontWeight: "600", align: "right", color: "auto", background: "transparent" },
        { id: "mediaFrame", type: "mediaFrame", x: 40, y: 252, width: 1000, height: 1100, borderRadius: 6 },
        { id: "headline", type: "headline", x: 64, y: 1376, width: 952, height: 140, fontSize: 36, fontWeight: "600", lineHeight: 1.18, maxLines: 3, align: "left", color: "auto" },
        { id: "cta", type: "cta", x: 64, y: 1536, width: 320, height: 56, fontSize: 22, fontWeight: "700", align: "center", background: "brand-accent", borderRadius: 4 },
        { id: "branding", type: "branding", x: 64, y: 1616, width: 952, height: 40, fontSize: 20, fontWeight: "500", align: "left", color: "auto" },
      ],
    },
  },
}
