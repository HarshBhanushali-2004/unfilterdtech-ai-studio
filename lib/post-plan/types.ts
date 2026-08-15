import type { CarouselSlideMediaType, MediaResolutionStatus } from "@prisma/client"

import type { PlannerObject } from "@/lib/ai/planner-schemas"
import type { ResearchObject } from "@/lib/ai/research-schemas"

export type PostPlanInput = {
  topic: string
  plannerId: string
  planner: PlannerObject
  research: ResearchObject
  brandKitId: string | null
  brandContext: string
}

/** Client-facing shape of a `PostMedia` row — dates serialized to ISO strings. */
export type PostMediaDTO = {
  id: string
  postPlanId: string
  mediaType: CarouselSlideMediaType
  mediaAssetId: string | null
  renderedImageUrl: string | null
  width: number | null
  height: number | null
  status: MediaResolutionStatus
  resolutionPath: string | null
  errorMessage: string | null
  errorCode: string | null
  createdAt: string
  updatedAt: string
}
