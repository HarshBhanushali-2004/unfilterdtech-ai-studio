import { ImageGenerationError, type ImageGenerationErrorCode } from "./errors"
import { FluxImageProvider } from "./flux-provider"
import { GeminiImageProvider } from "./gemini-image-provider"
import {
  IMAGE_PROVIDER_NAMES,
  type GenerateImageRequest,
  type ImageProvider,
  type ImageProviderName,
  type ImageProviderResult,
} from "./types"

/**
 * Registered, working providers. Every name in `IMAGE_PROVIDER_NAMES` is a
 * provider the app knows *about* (surfaced in Settings); only the ones
 * present here are actually callable today. Add a provider by implementing
 * `ImageProvider` and registering it here — nothing else in the app needs
 * to change (see `OpenAIImageProvider` / `StabilityImageProvider` /
 * `LocalComfyUIProvider` when they're built).
 */
const PROVIDER_REGISTRY: Partial<Record<ImageProviderName, ImageProvider>> = {
  gemini: GeminiImageProvider,
  flux: FluxImageProvider,
}

/** Providers that are actually implemented and callable — used by Settings to distinguish "available" from "coming soon". */
export function getRegisteredImageProviderNames(): ImageProviderName[] {
  return Object.keys(PROVIDER_REGISTRY) as ImageProviderName[]
}

/** Errors worth a single automatic retry — transient, not a property of the prompt itself. */
const TRANSIENT_RETRY_CODES: ImageGenerationErrorCode[] = ["NETWORK_ERROR", "PROVIDER_UNAVAILABLE"]

export function getActiveImageProviderName(): ImageProviderName {
  const configured = process.env.IMAGE_PROVIDER?.trim().toLowerCase()

  if (configured && (IMAGE_PROVIDER_NAMES as readonly string[]).includes(configured)) {
    return configured as ImageProviderName
  }

  return "gemini"
}

export function getActiveImageProvider(): ImageProvider {
  const name = getActiveImageProviderName()
  const provider = PROVIDER_REGISTRY[name]

  if (!provider) {
    throw new ImageGenerationError(
      "PROVIDER_UNAVAILABLE",
      `The "${name}" image provider isn't implemented yet.`
    )
  }

  return provider
}

function normalize(error: unknown): ImageGenerationError {
  return error instanceof ImageGenerationError ? error : new ImageGenerationError("UNKNOWN", undefined, error)
}

/**
 * The Image Provider Manager — the single entry point the rest of the
 * application uses to generate an image. Owns provider selection, a single
 * automatic retry for transient failures, and normalized error output. No
 * caller outside this file (and its provider implementations) should ever
 * know which provider actually produced the image.
 */
export async function generateImage(request: GenerateImageRequest): Promise<ImageProviderResult> {
  const provider = getActiveImageProvider()

  try {
    return await provider.generateImage(request)
  } catch (error) {
    const normalized = normalize(error)

    if (!TRANSIENT_RETRY_CODES.includes(normalized.code)) {
      throw normalized
    }

    try {
      return await provider.generateImage(request)
    } catch (retryError) {
      throw normalize(retryError)
    }
  }
}
