export type LuminanceSample = {
  averageLuminance: number
  isDark: boolean
}

/** Samples a canvas region's average perceptual luminance (0-255) to decide whether it reads as "dark" or "light" underneath. */
export function sampleRegionLuminance(
  ctx: CanvasRenderingContext2D,
  region: { x: number; y: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number
): LuminanceSample {
  const x = Math.max(0, Math.min(Math.floor(region.x), canvasWidth - 1))
  const y = Math.max(0, Math.min(Math.floor(region.y), canvasHeight - 1))
  const width = Math.max(1, Math.min(Math.floor(region.width), canvasWidth - x))
  const height = Math.max(1, Math.min(Math.floor(region.height), canvasHeight - y))

  const { data } = ctx.getImageData(x, y, width, height)

  let total = 0
  let count = 0
  // Sample every 4th pixel — plenty for an average on regions this size, much cheaper than every pixel.
  const stride = 4 * 4
  for (let i = 0; i < data.length; i += stride) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    count += 1
  }

  const averageLuminance = count > 0 ? total / count : 255
  return { averageLuminance, isDark: averageLuminance < 130 }
}

/** Accessible text/shadow color pairing for a sampled background — white-on-dark or near-black-on-light, always with a matching shadow for legibility over a photo. */
export function textColorForBackground(sample: LuminanceSample): { fill: string; shadow: string; muted: string } {
  return sample.isDark
    ? { fill: "#FFFFFF", shadow: "rgba(0,0,0,0.6)", muted: "rgba(255,255,255,0.82)" }
    : { fill: "#14151A", shadow: "rgba(255,255,255,0.65)", muted: "rgba(20,21,26,0.75)" }
}
