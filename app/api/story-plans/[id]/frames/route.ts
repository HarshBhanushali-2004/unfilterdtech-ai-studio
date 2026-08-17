import { NextResponse } from "next/server"

import { listStoryFrameMedia } from "@/lib/story-plan/generate-media-for-plan"
import { getStoryPlanById } from "@/lib/story-plan/service"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * Lists every resolved/rendered frame for a Story Plan — mirrors
 * `GET /api/carousel-plans/[id]/slides`, including the same `totalFrames`
 * (the plan's own `frameCount`) for the fullscreen viewer's counter — see
 * that route's doc comment for why this shouldn't come from `Creation.story`.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const [frames, plan] = await Promise.all([listStoryFrameMedia(id), getStoryPlanById(id)])
    return NextResponse.json({ data: frames, totalFrames: plan?.data.frameCount ?? null })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to load story frames." }, { status: 500 })
  }
}
