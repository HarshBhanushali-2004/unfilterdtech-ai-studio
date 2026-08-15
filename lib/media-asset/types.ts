import type { MediaAssetSource, MediaLicenseStatus, MediaType } from "@prisma/client"

/** Client-facing shape of a `MediaAsset` row — dates serialized to ISO strings. */
export type MediaAssetDTO = {
  id: string
  type: MediaType
  source: MediaAssetSource
  licenseStatus: MediaLicenseStatus
  url: string
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  duration: number | null
  mimeType: string | null
  provider: string | null
  attribution: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type CreateMediaAssetInput = {
  type: MediaType
  source: MediaAssetSource
  licenseStatus: MediaLicenseStatus
  url: string
  thumbnailUrl?: string | null
  width?: number | null
  height?: number | null
  duration?: number | null
  mimeType?: string | null
  provider?: string | null
  attribution?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}
