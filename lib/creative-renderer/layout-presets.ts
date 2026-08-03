import type { LayoutDimensions, OutputFormat } from "./types"

/**
 * Canvas dimensions per output format, matching each platform surface's
 * recommended upload size so the exported PNG/JPEG is publishable without
 * any manual cropping.
 */
export const LAYOUT_PRESETS: Record<OutputFormat, LayoutDimensions> = {
  post: { width: 1080, height: 1080, label: "Instagram Post (1:1)" },
  story: { width: 1080, height: 1920, label: "Instagram Story (9:16)" },
  "reel-cover": { width: 1080, height: 1920, label: "Reel Cover (9:16)" },
  carousel: { width: 1080, height: 1350, label: "Carousel Slide (4:5)" },
  linkedin: { width: 1200, height: 627, label: "LinkedIn Landscape (1.91:1)" },
}

/** Picks a sensible default output format from the Visual Assets slot the source image came from. */
export function defaultOutputFormatForSlot(slot: string): OutputFormat {
  if (slot.startsWith("carousel.")) return "carousel"
  if (slot.startsWith("story.")) return "story"
  if (slot.startsWith("reel.")) return "reel-cover"
  return "post"
}
