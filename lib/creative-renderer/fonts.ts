import { Bebas_Neue, Inter, Montserrat, Oswald, Playfair_Display, Poppins } from "next/font/google"

import type { RendererFont } from "./types"

// A small curated set of Google Fonts for the Creative Renderer's typography
// options — loaded once via next/font (self-hosted, no runtime request to
// Google Fonts) and referenced by CSS variable so <canvas> text rendering
// can pick them up once loaded into the document.
const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--renderer-font-inter" })
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--renderer-font-poppins" })
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--renderer-font-montserrat" })
const playfairDisplay = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--renderer-font-playfair" })
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--renderer-font-bebas" })
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--renderer-font-oswald" })

/** The actual CSS font-family name to hand to a Canvas 2D context's `font` property for each renderer font option. */
export const RENDERER_FONT_FAMILY: Record<RendererFont, string> = {
  Inter: inter.style.fontFamily,
  Poppins: poppins.style.fontFamily,
  Montserrat: montserrat.style.fontFamily,
  "Playfair Display": playfairDisplay.style.fontFamily,
  "Bebas Neue": bebasNeue.style.fontFamily,
  Oswald: oswald.style.fontFamily,
}

/** Combined class list — apply to a mounted element so every renderer font's stylesheet is present in the document (required before Canvas can render text in it). */
export const RENDERER_FONT_CLASSNAMES = [
  inter.variable,
  poppins.variable,
  montserrat.variable,
  playfairDisplay.variable,
  bebasNeue.variable,
  oswald.variable,
].join(" ")
