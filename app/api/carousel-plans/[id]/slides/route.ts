import { NextResponse } from "next/server"

import { listCarouselSlideMedia } from "@/lib/carousel-plan/generate-media-for-plan"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * Lists every resolved/rendered slide for a Carousel Plan — used to
 * hydrate the Review page's carousel gallery on load/reload, mirroring
 * `GET /api/visual-prompts/[id]/images`.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const slides = await listCarouselSlideMedia(id)
    return NextResponse.json({ data: slides })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to load carousel slides." }, { status: 500 })
  }
}
