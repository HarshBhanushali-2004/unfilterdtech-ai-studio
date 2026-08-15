import { NextResponse } from "next/server"

import { listStoryFrameMedia } from "@/lib/story-plan/generate-media-for-plan"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

/** Lists every resolved/rendered frame for a Story Plan — mirrors `GET /api/carousel-plans/[id]/slides`. */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const frames = await listStoryFrameMedia(id)
    return NextResponse.json({ data: frames })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to load story frames." }, { status: 500 })
  }
}
