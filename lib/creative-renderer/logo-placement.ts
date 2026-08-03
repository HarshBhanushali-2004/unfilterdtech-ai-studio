import type { LogoPosition } from "./types"

type Candidate = { position: LogoPosition; x: number; y: number }

function candidateRegions(
  canvasWidth: number,
  canvasHeight: number,
  logoSize: number,
  margin: number
): Candidate[] {
  return [
    { position: "top-left", x: margin, y: margin },
    { position: "top-right", x: canvasWidth - margin - logoSize, y: margin },
    { position: "bottom-left", x: margin, y: canvasHeight - margin - logoSize },
    { position: "bottom-right", x: canvasWidth - margin - logoSize, y: canvasHeight - margin - logoSize },
    { position: "center", x: (canvasWidth - logoSize) / 2, y: (canvasHeight - logoSize) / 2 },
  ]
}

/**
 * Scores a region's visual "busyness" as a proxy for it containing a
 * face/object/text worth avoiding: local luminance variance (standard
 * deviation) — a flat sky or a smooth gradient scores low, detailed texture,
 * edges, and typically faces/objects score high. This is a real, working
 * heuristic, not machine-learning-based face/object detection; a true
 * detector would need a new model dependency (e.g. face-api.js/tfjs) this
 * app doesn't carry today.
 */
function regionBusyness(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  canvasWidth: number,
  canvasHeight: number
): number {
  const left = Math.max(0, Math.min(x, canvasWidth - 1))
  const top = Math.max(0, Math.min(y, canvasHeight - 1))
  const width = Math.max(1, Math.min(size, canvasWidth - left))
  const height = Math.max(1, Math.min(size, canvasHeight - top))

  const { data } = ctx.getImageData(left, top, width, height)

  let sum = 0
  let sumSq = 0
  let count = 0
  const stride = 4 * 3
  for (let i = 0; i < data.length; i += stride) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    sum += luminance
    sumSq += luminance * luminance
    count += 1
  }
  if (count === 0) return 0

  const mean = sum / count
  const variance = Math.max(0, sumSq / count - mean * mean)
  return Math.sqrt(variance)
}

const BUSYNESS_THRESHOLD = 38

export type LogoPlacementResult = {
  x: number
  y: number
  position: LogoPosition
  /** True when the preferred position was overridden because it scored as visually busy. */
  moved: boolean
}

/**
 * Picks logo coordinates: starts from the brand's preferred position, and
 * only overrides it when that region is visually busy enough that a logo
 * there would likely obscure something — falling back to whichever
 * candidate corner (or center) is quietest.
 */
export function resolveLogoPlacement(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  logoSize: number,
  marginPx: number,
  preferredPosition: LogoPosition
): LogoPlacementResult {
  const candidates = candidateRegions(canvasWidth, canvasHeight, logoSize, marginPx)
  const scored = candidates.map((candidate) => ({
    ...candidate,
    busyness: regionBusyness(ctx, candidate.x, candidate.y, logoSize, canvasWidth, canvasHeight),
  }))

  const preferred = scored.find((c) => c.position === preferredPosition) ?? scored[scored.length - 1]

  if (preferred.busyness <= BUSYNESS_THRESHOLD) {
    return { x: preferred.x, y: preferred.y, position: preferred.position, moved: false }
  }

  const quietest = scored.reduce((best, candidate) => (candidate.busyness < best.busyness ? candidate : best), preferred)
  return { x: quietest.x, y: quietest.y, position: quietest.position, moved: quietest.position !== preferredPosition }
}
