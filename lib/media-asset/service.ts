import type { MediaAsset, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

import type { CreateMediaAssetInput, MediaAssetDTO } from "./types"

function toDTO(record: MediaAsset): MediaAssetDTO {
  return {
    id: record.id,
    type: record.type,
    source: record.source,
    licenseStatus: record.licenseStatus,
    url: record.url,
    thumbnailUrl: record.thumbnailUrl,
    width: record.width,
    height: record.height,
    duration: record.duration,
    mimeType: record.mimeType,
    provider: record.provider,
    attribution: (record.attribution as Record<string, unknown> | null) ?? null,
    metadata: (record.metadata as Record<string, unknown> | null) ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

/**
 * Persists a resolved media file as a provider-agnostic `MediaAsset` row —
 * the single write path every source in the Media Resolver goes through
 * (user-provided, source media, or a Gemini-generated fallback), so nothing
 * downstream ever has to branch on provenance. See
 * `lib/media-resolver/service.ts`.
 */
export async function createMediaAsset(input: CreateMediaAssetInput): Promise<MediaAssetDTO> {
  const record = await prisma.mediaAsset.create({
    data: {
      type: input.type,
      source: input.source,
      licenseStatus: input.licenseStatus,
      url: input.url,
      thumbnailUrl: input.thumbnailUrl ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      duration: input.duration ?? null,
      mimeType: input.mimeType ?? null,
      provider: input.provider ?? null,
      attribution: (input.attribution ?? undefined) as Prisma.InputJsonValue | undefined,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })

  return toDTO(record)
}

export async function getMediaAsset(id: string): Promise<MediaAssetDTO | null> {
  const record = await prisma.mediaAsset.findUnique({ where: { id } })
  return record ? toDTO(record) : null
}
