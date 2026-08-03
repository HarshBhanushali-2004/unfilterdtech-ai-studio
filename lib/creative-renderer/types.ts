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
