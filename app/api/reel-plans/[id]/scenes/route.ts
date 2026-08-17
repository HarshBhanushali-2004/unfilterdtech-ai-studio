import { NextResponse } from "next/server"

import { listReelSceneMedia } from "@/lib/reel-plan/generate-media-for-plan"
import { getReelPlanById } from "@/lib/reel-plan/service"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * Lists every scene storyboard preview for a Reel Plan — mirrors
 * `GET /api/carousel-plans/[id]/slides`, including the same `totalScenes`
 * (the plan's own `sceneCount`) for the fullscreen viewer's counter — see
 * that route's doc comment for why this shouldn't come from `Creation.reel`.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const [scenes, plan] = await Promise.all([listReelSceneMedia(id), getReelPlanById(id)])
    return NextResponse.json({ data: scenes, totalScenes: plan?.data.sceneCount ?? null })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to load reel scenes." }, { status: 500 })
  }
}
