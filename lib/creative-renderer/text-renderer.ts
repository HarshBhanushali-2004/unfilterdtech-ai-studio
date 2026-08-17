import type { RenderContext2D } from "./types"

/** Greedy word-wrap against the canvas's currently-set font — caller must set `ctx.font` first. */
export function wrapText(ctx: RenderContext2D, text: string, maxWidth: number): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const words = trimmed.split(/\s+/)
  const lines: string[] = []
  let currentLine = words[0] ?? ""

  for (let i = 1; i < words.length; i++) {
    const candidate = `${currentLine} ${words[i]}`
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate
    } else {
      lines.push(currentLine)
      currentLine = words[i]
    }
  }
  if (currentLine) lines.push(currentLine)

  return lines
}

/** Truncates a wrapped line list to `maxLines`, appending an ellipsis to the last kept line if anything was cut — this is what guarantees text never overflows its box. */
function clampLines(ctx: RenderContext2D, lines: string[], maxWidth: number, maxLines: number): string[] {
  if (lines.length <= maxLines) return lines

  const kept = lines.slice(0, maxLines)
  let lastLine = kept[maxLines - 1]

  while (lastLine.length > 0 && ctx.measureText(`${lastLine}…`).width > maxWidth) {
    lastLine = lastLine.slice(0, -1).trimEnd()
  }
  kept[maxLines - 1] = `${lastLine}…`

  return kept
}

export type TextBlockOptions = {
  text: string
  x: number
  y: number
  maxWidth: number
  fontSize: number
  fontFamily: string
  fontWeight?: string
  color: string
  shadowColor?: string
  lineHeightMultiplier?: number
  align?: CanvasTextAlign
  maxLines?: number
  /** CSS length (e.g. "-1.2px") — feature-detected via `"letterSpacing" in ctx`, same guard as everywhere else this touches canvas letter-spacing. Negative values tighten large bold headlines into a more deliberate, premium-editorial feel instead of default browser/font tracking (Phase 1C.6 QA feedback: "headline treatment still feels generic"). */
  letterSpacing?: string
}

/**
 * Draws a wrapped, shadowed, never-overflowing text block anchored at
 * (x, y) as its top-left (or top-center/top-right depending on `align`).
 * Returns the total pixel height actually consumed, so callers can stack
 * blocks (headline → subtitle → CTA → footer) without overlap.
 */
export function drawTextBlock(ctx: RenderContext2D, options: TextBlockOptions): number {
  const {
    text,
    x,
    y,
    maxWidth,
    fontSize,
    fontFamily,
    fontWeight = "600",
    color,
    shadowColor,
    lineHeightMultiplier = 1.25,
    align = "left",
    maxLines = 4,
    letterSpacing,
  } = options

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.textAlign = align
  ctx.textBaseline = "top"
  if (letterSpacing !== undefined && "letterSpacing" in ctx) ctx.letterSpacing = letterSpacing

  const rawLines = wrapText(ctx, text, maxWidth)
  const lines = clampLines(ctx, rawLines, maxWidth, maxLines)
  const lineHeight = fontSize * lineHeightMultiplier

  lines.forEach((line, index) => {
    const lineY = y + index * lineHeight

    if (shadowColor) {
      ctx.shadowColor = shadowColor
      ctx.shadowBlur = fontSize * 0.18
      ctx.shadowOffsetY = fontSize * 0.04
    }

    ctx.fillStyle = color
    ctx.fillText(line, x, lineY)

    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
  })

  if (letterSpacing !== undefined && "letterSpacing" in ctx) ctx.letterSpacing = "0px"

  return lines.length * lineHeight
}

/** Draws a rounded rectangle path — used for the CTA button and the canvas's own corner rounding. */
export function roundedRectPath(
  ctx: RenderContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}
