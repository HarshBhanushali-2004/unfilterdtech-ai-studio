import { ImageGenerationError } from "./errors"
import { readImageDimensions } from "./image-dimensions"
import type { GenerateImageRequest, ImageProvider, ImageProviderResult } from "./types"

const MODEL_ID = "black-forest-labs/FLUX.1-schnell"
// HuggingFace's unified "Inference Providers" router, routed to the
// "together" backend — the model's `hf-inference` serverless route is
// deprecated for FLUX.1 Schnell (confirmed live: HF's model API lists
// nscale/fal-ai/together/wavespeed as the current live providers; "together"
// exposes an OpenAI-images-compatible endpoint, which is what this uses).
const ENDPOINT_URL = "https://router.huggingface.co/together/v1/images/generations"
const REQUEST_TIMEOUT_MS = 60_000

type TogetherImagesResponse = {
  id?: string
  data?: Array<{ b64_json?: string; url?: string }>
}

function getHfToken(): string {
  const token = process.env.HF_TOKEN?.trim()

  if (!token) {
    throw new ImageGenerationError(
      "PROVIDER_UNAVAILABLE",
      "Missing HF_TOKEN — set it in your environment to use the FLUX image provider."
    )
  }

  return token
}

async function readErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const contentType = response.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
      const body = await response.json()
      if (typeof body?.error === "string") return body.error
      if (typeof body?.error?.message === "string") return body.error.message
      return undefined
    }

    const text = await response.text()
    return text.trim().slice(0, 300) || undefined
  } catch {
    return undefined
  }
}

function toImageGenerationError(status: number, message: string | undefined): ImageGenerationError {
  if (status === 429) {
    return new ImageGenerationError("QUOTA_EXCEEDED", message)
  }
  if (status === 401 || status === 403) {
    return new ImageGenerationError(
      "PROVIDER_UNAVAILABLE",
      "HuggingFace rejected the request — check that HF_TOKEN is valid."
    )
  }
  if (status === 400 || status === 422) {
    return new ImageGenerationError("INVALID_PROMPT", message)
  }
  if (status === 503) {
    return new ImageGenerationError(
      "PROVIDER_UNAVAILABLE",
      message ?? "The FLUX model is warming up. Try again in a moment."
    )
  }
  if (status >= 500) {
    return new ImageGenerationError("PROVIDER_UNAVAILABLE", message)
  }

  return new ImageGenerationError("UNKNOWN", message)
}

/**
 * FLUX.1 Schnell via HuggingFace's Inference Providers router. This file
 * owns nothing beyond FLUX/HF-specific request shaping and error
 * classification — API key handling, retries, and normalized output are the
 * Image Provider Manager's job (`manager.ts`), same as every other
 * provider.
 */
export const FluxImageProvider: ImageProvider = {
  name: "flux",

  async generateImage(request: GenerateImageRequest): Promise<ImageProviderResult> {
    const startedAt = Date.now()
    const token = getHfToken()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let response: Response

    try {
      response = await fetch(ENDPOINT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_ID,
          prompt: request.prompt,
          response_format: "b64_json",
        }),
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ImageGenerationError("TIMEOUT", undefined, error)
      }
      throw new ImageGenerationError("NETWORK_ERROR", undefined, error)
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const message = await readErrorMessage(response)
      throw toImageGenerationError(response.status, message)
    }

    let payload: TogetherImagesResponse
    try {
      payload = await response.json()
    } catch (error) {
      throw new ImageGenerationError("UNKNOWN", "FLUX returned an unparsable response.", error)
    }

    const base64 = payload.data?.[0]?.b64_json

    if (!base64) {
      throw new ImageGenerationError("UNKNOWN", "FLUX response did not contain image data.")
    }

    const bytes = Buffer.from(base64, "base64")
    // Together's FLUX.1 Schnell endpoint returns JPEG bytes (confirmed by
    // decoding the response) — no PNG-specific content-type header is sent
    // back on this JSON path, unlike a raw-bytes provider response.
    const mimeType = "image/jpeg"
    const dimensions = readImageDimensions(bytes, mimeType)

    return {
      provider: "flux",
      generationTimeMs: Date.now() - startedAt,
      generationId: payload.id,
      image: {
        base64,
        mimeType,
        width: dimensions?.width,
        height: dimensions?.height,
      },
    }
  },
}
