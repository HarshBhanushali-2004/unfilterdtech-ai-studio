import { createCanvas, GlobalFonts, loadImage as loadNapiImage } from "@napi-rs/canvas"
import { join } from "path"

import type { RenderContext2DWithImages, RenderImageLike } from "./types"

/**
 * Server-side counterpart to `load-image.ts` (browser). Used by
 * `lib/template-renderer/render-frame.ts` — every content format's
 * renderer must run headless (no browser) so `/api/creations/[id]/regenerate`
 * can produce frames with no client involved, matching the rest of the
 * app's "AI generates everything automatically" pipeline.
 */
export async function loadNodeImage(src: string): Promise<RenderImageLike> {
  return loadNapiImage(src)
}

export function createNodeCanvas(width: number, height: number): { ctx: RenderContext2DWithImages; toPngDataUrl: () => string } {
  const canvas = createCanvas(width, height)
  // `@napi-rs/canvas`'s context implements the full Canvas 2D surface
  // `RenderContext2DWithImages` is a deliberately-narrowed structural
  // subset of — see the type's doc comment in `./types.ts`.
  const ctx = canvas.getContext("2d") as unknown as RenderContext2DWithImages

  return {
    ctx,
    toPngDataUrl: () => canvas.toDataURL("image/png"),
  }
}

let fontsRegistered = false

/**
 * Registers the one bundled, self-hosted font (Inter, the Brand Kit's
 * default `headingFont`/`bodyFont` — see `prisma/schema.prisma`) with
 * `@napi-rs/canvas`'s global font registry. Node canvas rendering has no
 * access to the browser's `next/font`-loaded stylesheets
 * (`lib/creative-renderer/fonts.ts`), and a serverless runtime can't be
 * assumed to have *any* system fonts installed — without this, text would
 * silently render as empty boxes. Idempotent (safe to call on every
 * request; a warm serverless instance only pays the cost once).
 *
 * Phase 1 scope note: only Inter is bundled. A Brand Kit that selects one
 * of the other five `RendererFont` options (Poppins, Montserrat, Playfair
 * Display, Bebas Neue, Oswald) still renders — `render-slide.ts` falls back
 * to Inter for those — rather than failing the whole slide. Bundling the
 * remaining fonts is a deferred, purely additive follow-up (see the Phase 1
 * summary), not an architectural gap.
 */
export function ensureNodeFontsRegistered(): void {
  if (fontsRegistered) return

  const fontDir = join(process.cwd(), "node_modules/@fontsource/inter/files")

  try {
    GlobalFonts.registerFromPath(join(fontDir, "inter-latin-400-normal.woff"), "Inter")
    GlobalFonts.registerFromPath(join(fontDir, "inter-latin-600-normal.woff"), "Inter")
    GlobalFonts.registerFromPath(join(fontDir, "inter-latin-700-normal.woff"), "Inter")
    fontsRegistered = true
  } catch (error) {
    // Rendering can still proceed with whatever fallback glyphs Skia has —
    // never let a font registration failure break carousel generation.
    console.error("[CarouselRenderer] Failed to register Inter for server-side rendering:", error)
  }
}
