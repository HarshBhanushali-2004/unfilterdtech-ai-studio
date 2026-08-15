import { NextResponse } from "next/server"

import { getPostMedia } from "@/lib/post-plan/generate-media-for-plan"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * The resolved/rendered media for a Post Plan — used to hydrate the Review
 * page's post preview on load/reload, mirroring
 * `GET /api/carousel-plans/[id]/slides`.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const media = await getPostMedia(id)
    return NextResponse.json({ data: media })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to load post media." }, { status: 500 })
  }
}
