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

/**
 * Fallback order across *registered* providers — tried after the active
 * provider (whichever it is) has exhausted its own retry. Only "gemini" and
 * "flux" are actually implemented (`PROVIDER_REGISTRY` above); the manager
 * skips any name here with no registered implementation, so this list is
 * safe to extend the moment a new provider is registered without anything
 * else changing.
 */
const FALLBACK_PROVIDER_ORDER: ImageProviderName[] = ["gemini", "flux"]

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
 * Attempts one provider end-to-end: the call, then — only for a transient
 * failure (`TRANSIENT_RETRY_CODES`) — a single same-provider retry. Returns
 * the normalized error rather than throwing, so the Manager can decide
 * whether to fall through to another provider without a try/catch at every
 * call site.
 */
async function attemptProvider(
  provider: ImageProvider,
  request: GenerateImageRequest
): Promise<{ result: ImageProviderResult } | { error: ImageGenerationError }> {
  try {
    return { result: await provider.generateImage(request) }
  } catch (error) {
    const normalized = normalize(error)
    if (!TRANSIENT_RETRY_CODES.includes(normalized.code)) {
      return { error: normalized }
    }

    try {
      return { result: await provider.generateImage(request) }
    } catch (retryError) {
      return { error: normalize(retryError) }
    }
  }
}

/**
 * The Image Provider Manager — the single entry point the rest of the
 * application uses to generate an image. Owns provider selection, a single
 * automatic same-provider retry for transient failures, and — new here —
 * falling through to the next *registered* provider when the configured
 * active one fails outright (any error code, not just transient ones:
 * `QUOTA_EXCEEDED` is exactly the case this exists for). Concretely today:
 * Gemini (the default active provider) → FLUX (already registered and
 * configured via `HF_TOKEN`, see `flux-provider.ts`) → a normalized
 * failure the caller persists as that slide/frame/scene/post's own FAILED
 * media status. No caller outside this file (and its provider
 * implementations) should ever know which provider actually produced the
 * image, or that a fallback happened at all — `ImageProviderResult.provider`
 * already reports the real source either way.
 */
export async function generateImage(request: GenerateImageRequest): Promise<ImageProviderResult> {
  const activeName = getActiveImageProviderName()
  const order = [activeName, ...FALLBACK_PROVIDER_ORDER.filter((name) => name !== activeName)]

  let lastError: ImageGenerationError | null = null

  for (const name of order) {
    const provider = PROVIDER_REGISTRY[name]
    if (!provider) continue // Not implemented — nothing to fall through to.

    const attempt = await attemptProvider(provider, request)
    if ("result" in attempt) return attempt.result

    console.warn(
      `[ImageProviderManager] "${name}" failed (${attempt.error.code})${name === activeName ? "" : " on fallback"}${
        name !== order[order.length - 1] ? " — trying the next configured provider" : ""
      }`
    )
    lastError = attempt.error
  }

  throw (
    lastError ??
    new ImageGenerationError("PROVIDER_UNAVAILABLE", `The "${activeName}" image provider isn't implemented yet.`)
  )
}
