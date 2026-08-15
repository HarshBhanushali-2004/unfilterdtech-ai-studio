import { NextResponse } from "next/server"

import { listReelSceneMedia } from "@/lib/reel-plan/generate-media-for-plan"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

/** Lists every scene storyboard preview for a Reel Plan — mirrors `GET /api/carousel-plans/[id]/slides`. */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const scenes = await listReelSceneMedia(id)
    return NextResponse.json({ data: scenes })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to load reel scenes." }, { status: 500 })
  }
}
