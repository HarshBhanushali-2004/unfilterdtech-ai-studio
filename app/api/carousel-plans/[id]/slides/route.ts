import { NextResponse } from "next/server"

import { listCarouselSlideMedia } from "@/lib/carousel-plan/generate-media-for-plan"
import { getCarouselPlanById } from "@/lib/carousel-plan/service"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * Lists every resolved/rendered slide for a Carousel Plan — used to
 * hydrate the Review page's carousel gallery on load/reload, mirroring
 * `GET /api/visual-prompts/[id]/images`.
 *
 * Also returns `totalSlides`, the plan's own authoritative slide count
 * (`CarouselPlanObject.slideCount`, Zod-enforced to equal `slides.length`
 * at generation time). This is the real "TOTAL_SLIDES" for the fullscreen
 * viewer's counter (Phase 1C.6) — it's deliberately not derived from
 * `Creation.carousel` (the separately-generated caption/copy array,
 * `carousel?.length` in `generated-content-sections.tsx`), which can drift
 * out of sync with how many slides the plan actually rendered.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const [slides, plan] = await Promise.all([listCarouselSlideMedia(id), getCarouselPlanById(id)])
    return NextResponse.json({ data: slides, totalSlides: plan?.data.slideCount ?? null })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to load carousel slides." }, { status: 500 })
  }
}
