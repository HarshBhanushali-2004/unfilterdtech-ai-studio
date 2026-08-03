import { createHash } from "crypto"

import type { GeneratedImage } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import {
  ImageGenerationError,
  generateImage as generateImageWithActiveProvider,
  getActiveImageProviderName,
  type ImageGenerationErrorCode,
} from "@/lib/ai/image-providers"
import type { ImagePromptSpec } from "@/lib/ai/visual-prompt-schemas"

import type { GeneratedImageDTO } from "./types"

function hashPromptVersion(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

function toDTO(record: GeneratedImage): GeneratedImageDTO {
  return {
    id: record.id,
    visualPromptId: record.visualPromptId,
    slot: record.slot,
    provider: record.provider,
    status: record.status,
    imageUrl: record.imageUrl,
    width: record.width,
    height: record.height,
    promptText: record.promptText,
    generationTimeMs: record.generationTimeMs,
    errorMessage: record.errorMessage,
    errorCode: record.errorCode as ImageGenerationErrorCode | null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

/** All generated images for a Visual Prompt, one per slot at most — used to hydrate the Visual Assets panel on load/reload. */
export async function listGeneratedImages(visualPromptId: string): Promise<GeneratedImageDTO[]> {
  const records = await prisma.generatedImage.findMany({ where: { visualPromptId } })
  return records.map(toDTO)
}

export type GenerateImageForSlotInput = {
  visualPromptId: string
  slot: string
  promptSpec: ImagePromptSpec
  promptOverride?: string
  forceRegenerate?: boolean
}

/**
 * Generates (or reuses) the image for one prompt slot. Cache rule (Feature
 * 9): if a COMPLETED image already exists for this exact prompt text, it's
 * returned as-is with no provider call — a slot only regenerates when the
 * prompt text actually changed (an edit) or the caller explicitly forces it
 * ("Regenerate"). Always returns a DTO, even on provider failure — a failed
 * generation is a normal, persisted outcome (`status: "FAILED"`), not a
 * thrown error, so the API layer doesn't have to translate exceptions into
 * partial UI state.
 */
export async function generateImageForSlot({
  visualPromptId,
  slot,
  promptSpec,
  promptOverride,
  forceRegenerate,
}: GenerateImageForSlotInput): Promise<GeneratedImageDTO> {
  const promptText = promptOverride?.trim() || promptSpec.fullPrompt
  const promptVersion = hashPromptVersion(promptText)

  const existing = await prisma.generatedImage.findUnique({
    where: { visualPromptId_slot: { visualPromptId, slot } },
  })

  if (
    !forceRegenerate &&
    existing &&
    existing.status === "COMPLETED" &&
    existing.promptVersion === promptVersion
  ) {
    return toDTO(existing)
  }

  const providerName = getActiveImageProviderName()

  const pending = await prisma.generatedImage.upsert({
    where: { visualPromptId_slot: { visualPromptId, slot } },
    create: {
      visualPromptId,
      slot,
      provider: providerName,
      status: "GENERATING",
      promptText,
      promptVersion,
    },
    update: {
      status: "GENERATING",
      provider: providerName,
      promptText,
      promptVersion,
      errorMessage: null,
      errorCode: null,
    },
  })

  try {
    const result = await generateImageWithActiveProvider({
      prompt: promptText,
      aspectRatio: promptSpec.aspectRatio,
    })

    const updated = await prisma.generatedImage.update({
      where: { id: pending.id },
      data: {
        status: "COMPLETED",
        provider: result.provider,
        imageUrl: `data:${result.image.mimeType};base64,${result.image.base64}`,
        width: result.image.width,
        height: result.image.height,
        generationTimeMs: result.generationTimeMs,
        generationId: result.generationId,
        errorMessage: null,
        errorCode: null,
      },
    })

    return toDTO(updated)
  } catch (error) {
    const normalized =
      error instanceof ImageGenerationError
        ? error
        : new ImageGenerationError("UNKNOWN", undefined, error)

    const failed = await prisma.generatedImage.update({
      where: { id: pending.id },
      data: {
        status: "FAILED",
        errorMessage: normalized.message,
        errorCode: normalized.code,
      },
    })

    return toDTO(failed)
  }
}

/** Deletes a generated image, scoped to its VisualPrompt so a stray id from another creation can't be used to delete it. */
export async function deleteGeneratedImage(visualPromptId: string, imageId: string): Promise<boolean> {
  const result = await prisma.generatedImage.deleteMany({
    where: { id: imageId, visualPromptId },
  })

  return result.count > 0
}
