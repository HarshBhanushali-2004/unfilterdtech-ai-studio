import type { CarouselSlideMediaType, MediaResolutionStatus } from "@prisma/client"

import type { PlannerObject } from "@/lib/ai/planner-schemas"
import type { ResearchObject } from "@/lib/ai/research-schemas"

export type ReelPlanInput = {
  topic: string
  plannerId: string
  planner: PlannerObject
  research: ResearchObject
  brandKitId: string | null
  brandContext: string
}

/** Client-facing shape of a `ReelSceneMedia` row — dates serialized to ISO strings. */
export type ReelSceneMediaDTO = {
  id: string
  reelPlanId: string
  sceneOrder: number
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
