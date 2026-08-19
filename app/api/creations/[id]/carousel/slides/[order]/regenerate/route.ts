import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCarouselPlanById } from "@/lib/carousel-plan/service";
import { generateMediaForCarouselSlide } from "@/lib/carousel-plan/generate-media-for-plan";

export const runtime = "nodejs";
// A single slide's image generation is one Gemini/FLUX call plus a fast
// local render — comfortably under the default serverless timeout, but
// kept generous for parity with the whole-carousel regenerate route.
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string; order: string }>;
};

/**
 * "Regenerate this slide" — Core Requirement #16 ("Do not regenerate every
 * image when only one failed slide needs regeneration"). Scoped to exactly
 * one slide of exactly one Creation's Carousel Plan: never touches the
 * plan's text (headline/body/CTA/visualIntent are left exactly as they
 * are — only that slide's *media* is re-resolved and re-rendered), never
 * regenerates any other slide, and never changes `Creation.contentType` or
 * any other Creation.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { id, order: orderParam } = await params;
  const slideOrder = Number(orderParam);

  if (!Number.isInteger(slideOrder) || slideOrder < 1) {
    return NextResponse.json({ error: "Invalid slide number." }, { status: 400 });
  }

  try {
    const creation = await prisma.creation.findUnique({
      where: { id },
      include: { project: { include: { brandKit: true } } },
    });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found." }, { status: 404 });
    }

    if (creation.contentType !== "CAROUSEL" || !creation.carouselPlanId) {
      return NextResponse.json(
        { error: "This creation has no carousel plan to regenerate a slide for." },
        { status: 400 }
      );
    }

    const carouselPlan = await getCarouselPlanById(creation.carouselPlanId);
    if (!carouselPlan) {
      return NextResponse.json({ error: "This carousel's plan could not be loaded." }, { status: 404 });
    }

    if (!carouselPlan.data.slides.some((slide) => slide.order === slideOrder)) {
      return NextResponse.json({ error: `Slide ${slideOrder} does not exist in this carousel.` }, { status: 404 });
    }

    const media = await generateMediaForCarouselSlide({
      carouselPlanId: creation.carouselPlanId,
      plan: carouselPlan.data,
      slideOrder,
      brandKit: creation.project?.brandKit ?? null,
    });

    // Same data-safety guard the whole-carousel Regenerate/Canva routes
    // already apply: this slide's rendered image just changed, so any
    // existing Canva link for this creation is now stale relative to what's
    // on screen — clear it rather than leaving `canvaSyncStatus` silently
    // pointing at an orphaned design. Run unconditionally (a no-op rewrite
    // of the same values when there was no link) so `Creation.updatedAt`
    // always bumps — the Review page's `mediaRefreshKey` is keyed off it to
    // pick up this slide's new image on the next `router.refresh()`.
    await prisma.creation.update({
      where: { id },
      data: {
        canvaDesignId: null,
        canvaEditUrl: null,
        canvaViewUrl: null,
        canvaLastSyncedAt: null,
        canvaSyncStatus: "NOT_LINKED",
      },
    });

    return NextResponse.json({ success: true, slide: media });
  } catch (error) {
    console.error(`Failed to regenerate slide ${slideOrder} for creation ${id}:`, error);
    return NextResponse.json({ error: "Unable to regenerate this slide right now." }, { status: 500 });
  }
}
