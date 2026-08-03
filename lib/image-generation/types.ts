import type { ImageGenerationStatus } from "@prisma/client"

import type { ImageGenerationErrorCode } from "@/lib/ai/image-providers"

/** Client-facing shape of a `GeneratedImage` row — dates serialized to ISO strings. */
export type GeneratedImageDTO = {
  id: string
  visualPromptId: string
  slot: string
  provider: string
  status: ImageGenerationStatus
  imageUrl: string | null
  width: number | null
  height: number | null
  promptText: string | null
  generationTimeMs: number | null
  errorMessage: string | null
  errorCode: ImageGenerationErrorCode | null
  createdAt: string
  updatedAt: string
}
