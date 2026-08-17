export const LOGO_POSITIONS = ["top-left", "top-right", "bottom-left", "bottom-right", "center"] as const
export type LogoPosition = (typeof LOGO_POSITIONS)[number]

export const TEXT_STYLES = ["bold", "elegant", "minimal", "playful"] as const
export type TextStyle = (typeof TEXT_STYLES)[number]

export const LAYOUT_STYLES = ["bottom-aligned", "centered", "split", "minimal"] as const
export type LayoutStyle = (typeof LAYOUT_STYLES)[number]

export const ICON_STYLES = ["outline", "filled", "duotone"] as const
export type IconStyle = (typeof ICON_STYLES)[number]

/** A small curated set of Google Fonts loaded via next/font — see lib/creative-renderer/fonts.ts. */
export const RENDERER_FONTS = ["Inter", "Poppins", "Montserrat", "Playfair Display", "Bebas Neue", "Oswald"] as const
export type RendererFont = (typeof RENDERER_FONTS)[number]

export const OUTPUT_FORMATS = ["post", "story", "reel-cover", "carousel", "linkedin"] as const
export type OutputFormat = (typeof OUTPUT_FORMATS)[number]

export const LOGO_VARIANTS = ["primary", "secondary", "white", "dark", "watermark"] as const
export type LogoVariant = (typeof LOGO_VARIANTS)[number]

export type LayoutDimensions = {
  width: number
  height: number
  label: string
}

/** Brand inputs the renderer needs — a trimmed view of BrandKit, decoupled from the Prisma model shape. */
export type BrandRenderProfile = {
  logos: Partial<Record<LogoVariant, string | null>>
  watermarkEnabled: boolean
  logoPosition: LogoPosition
  safeMargin: number
  headingFont: RendererFont
  bodyFont: RendererFont
  overlayOpacity: number
  textStyle: TextStyle
  layoutStyle: LayoutStyle
  iconStyle: IconStyle
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

export type CreativeCopy = {
  headline: string
  subtitle: string
  cta: string
  footer: string
  website: string
}

export type CreativeConfig = CreativeCopy &
  BrandRenderProfile & {
    outputFormat: OutputFormat
    logoVariant: LogoVariant
  }

/** Anything with pixel dimensions a `drawImage` call can size against — satisfied by `HTMLImageElement` (browser) and `@napi-rs/canvas`'s `Image` (Node). */
export type RenderImageLike = {
  width: number
  height: number
}

/**
 * The minimal Canvas 2D surface the shared drawing primitives in
 * `text-renderer.ts` actually use — deliberately not the full DOM
 * `CanvasRenderingContext2D` (hundreds of members), so both a real browser
 * context and `@napi-rs/canvas`'s Node context satisfy it structurally
 * without either one needing to "pretend" to be the other. This is what
 * lets `drawTextBlock`/`roundedRectPath` run unchanged from both
 * `compositor.ts` (browser, still unused — see CLAUDE.md) and
 * `lib/template-renderer/render-frame.ts` (Node, the shared renderer every
 * content format's frame goes through) — see AGENTS.md: "do not create a
 * duplicate rendering engine."
 */
export type RenderContext2D = {
  save(): void
  restore(): void

  beginPath(): void
  closePath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  clip(): void
  fill(): void
  stroke(): void

  fillRect(x: number, y: number, width: number, height: number): void
  clearRect(x: number, y: number, width: number, height: number): void

  /** Used by `render-frame.ts`'s `"scrim"` element (a legibility gradient behind text sitting over a full-bleed image) — see `RenderGradient` above. */
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): RenderGradient

  fillText(text: string, x: number, y: number, maxWidth?: number): void
  measureText(text: string): { width: number }

  /**
   * Write-only in practice — every caller (`text-renderer.ts`,
   * `render-slide.ts`) only ever assigns a plain color string, never reads
   * these back. Typed `unknown` rather than `string` deliberately: the
   * DOM's real `fillStyle`/`strokeStyle` accept
   * `string | CanvasGradient | CanvasPattern`, which isn't assignable to a
   * narrower `string` property (TypeScript checks settable-property
   * compatibility both ways) — `unknown` accepts the assignment from a
   * plain `string` at every call site while still letting a real DOM or
   * `@napi-rs/canvas` context satisfy this type.
   */
  fillStyle: unknown
  strokeStyle: unknown
  font: string
  textAlign: string
  textBaseline: string
  lineWidth: number
  lineCap: string
  lineJoin: string
  shadowColor: string
  shadowBlur: number
  shadowOffsetY: number
  globalAlpha: number
  /** Not part of the historical Canvas 2D spec (Chromium-only today) — `text-renderer.ts` feature-detects with `"letterSpacing" in ctx` before using it, same as before this type existed. */
  letterSpacing?: string
}

/** The minimal surface of a real `CanvasGradient` — every real Canvas 2D context's `createLinearGradient(...)` returns an object satisfying this structurally, same "narrowed subset" discipline as `RenderContext2D` itself. */
export type RenderGradient = {
  addColorStop(offset: number, color: string): void
}

/**
 * `RenderContext2D` plus `drawImage` — kept as a separate, wider type rather
 * than folded into `RenderContext2D` itself, because the DOM's real
 * `drawImage` is a 3-way overload keyed on `CanvasImageSource` (a large
 * union including `OffscreenCanvas`/`VideoFrame`), which isn't structurally
 * assignable to a single-signature version taking the narrower
 * `RenderImageLike`. `text-renderer.ts` (used from both the browser
 * `compositor.ts` and Node's `render-slide.ts`) never calls `drawImage`, so
 * it stays on the narrower `RenderContext2D` and both real contexts satisfy
 * it cleanly; only `render-slide.ts` (Node-only — never receives a real DOM
 * context) needs this wider type.
 */
export type RenderContext2DWithImages = RenderContext2D & {
  drawImage(image: RenderImageLike, dx: number, dy: number, dWidth: number, dHeight: number): void
}
