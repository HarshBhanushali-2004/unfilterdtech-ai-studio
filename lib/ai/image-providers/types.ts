/**
 * Every Image Provider the app knows how to select, implemented or not.
 * Keep this list in sync with `PROVIDER_REGISTRY` in `manager.ts` and the
 * Settings page's provider picker — an entry here with no matching
 * registry implementation is a valid, expected "coming soon" state.
 */
export const IMAGE_PROVIDER_NAMES = [
  "gemini",
  "flux",
  "openai",
  "stable-diffusion",
  "local-flux",
] as const

export type ImageProviderName = (typeof IMAGE_PROVIDER_NAMES)[number]

export type GenerateImageRequest = {
  prompt: string
  negativePrompt?: string
  aspectRatio?: string
}

export type GeneratedImageAsset = {
  /** Base64-encoded image bytes (no data: URL prefix). */
  base64: string
  mimeType: string
  width?: number
  height?: number
}

export type ImageProviderResult = {
  image: GeneratedImageAsset
  provider: ImageProviderName
  generationTimeMs: number
  /** Provider-side request/generation identifier, when the provider exposes one. */
  generationId?: string
}

/**
 * The contract every Image Provider implements — Gemini today, FLUX /
 * Stable Diffusion / OpenAI Images / a local FLUX server later. The rest of
 * the application never imports a concrete provider directly; it only ever
 * talks to the Image Provider Manager (`manager.ts`), which is the single
 * place that knows which provider is active.
 */
export type ImageProvider = {
  name: ImageProviderName
  generateImage(request: GenerateImageRequest): Promise<ImageProviderResult>
}
