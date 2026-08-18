import { NextResponse } from "next/server";
import type { BrandKit } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCanvaAccessToken } from "@/lib/canva/auth";
import { CanvaApiError } from "@/lib/canva/errors";
import { importDesign } from "@/lib/canva/design-import";
import { buildCarouselPptx, buildPostPptx, type CarouselPptxSlideInput } from "@/lib/canva/pptx-builder";
import { getPostPlanById } from "@/lib/post-plan/service";
import { getCarouselPlanById } from "@/lib/carousel-plan/service";
import { brandKitToRenderProfile } from "@/lib/template-renderer/brand-profile";
import { selectComposition } from "@/lib/template-renderer/composition-selector";
import { getComposition, getTemplate } from "@/lib/template-renderer/registry";
import type { FrameContent } from "@/lib/template-renderer/types";
import type { CarouselPlanObject } from "@/lib/ai/carousel-planner-schemas";
import type { PostPlanObject } from "@/lib/ai/post-planner-schemas";

// Calls Canva's Design Import API (an outbound fetch, plus polling) — needs
// the Node runtime, matching every other route in this app that calls an
// external SDK/API (CLAUDE.md Section 20).
export const runtime = "nodejs";
// Building the .pptx is fast, but the import job's poll loop can take a
// several-second round trip — same reasoning as regenerate's maxDuration.
// A Carousel deck (several slides, each with an image) can take longer to
// import than a single Post slide, so this stays generous for both.
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Same raw source-image selection `loadStillImageForCompositing` uses — the
 * still-frame poster for VIDEO, the file itself for IMAGE — but returning
 * the bare URL string rather than a loaded Node canvas Image, since the
 * pptx builder just needs a `data:` URL to embed. */
function mediaAssetToDataUrl(
  mediaAsset: { type: string; url: string; thumbnailUrl: string | null } | null
): string | null {
  if (!mediaAsset) return null;
  return mediaAsset.type === "VIDEO" ? (mediaAsset.thumbnailUrl ?? mediaAsset.url) : mediaAsset.url;
}

function buildPostPptxBuffer(
  postPlan: PostPlanObject,
  mediaDataUrl: string | null,
  brandKit: BrandKit | null
): Promise<Buffer> {
  const template = getTemplate(brandKit?.templateFamilyId);
  const compositionId = selectComposition({
    format: "post",
    headline: postPlan.headline,
    body: postPlan.body,
    mediaType: postPlan.mediaType,
    order: 1,
    total: 1,
  });
  const layout = getComposition(template, "post", compositionId);
  const brandProfile = brandKitToRenderProfile(brandKit);

  const content: FrameContent = {
    category: postPlan.category,
    headline: postPlan.headline,
    body: postPlan.body,
    cta: postPlan.cta,
  };

  return buildPostPptx({
    layout,
    content,
    // The raw, un-composited source image — never the already-flattened
    // `postMedia.renderedImageUrl` (see pptx-builder.ts's doc comment for why).
    mediaDataUrl,
    logoDataUrl: brandProfile.logos.primary ?? null,
    brand: brandProfile,
    brandLabel: brandKit?.name ?? "",
  });
}

/**
 * Carousel counterpart — one PPTX slide per `CarouselPlan` slide
 * (`buildCarouselPptx`, see that file's doc comment), preserving the
 * carousel's full slide structure in a single multi-page Canva design.
 * Does **not** require every slide's media to have succeeded — a slide
 * whose media failed still gets its own page, with the same tinted
 * placeholder `buildPostPptx` already falls back to for a missing image;
 * the point of this feature is exactly that a media failure never removes
 * a slide's text, and that holds just as much heading into Canva as it
 * does on the Review page.
 */
function buildCarouselPptxBuffer(
  carouselPlan: CarouselPlanObject,
  mediaBySlideOrder: Map<number, { type: string; url: string; thumbnailUrl: string | null } | null>,
  brandKit: BrandKit | null
): Promise<Buffer> {
  const template = getTemplate(brandKit?.templateFamilyId);
  const brandProfile = brandKitToRenderProfile(brandKit);
  const totalSlides = carouselPlan.slides.length;

  const slides: CarouselPptxSlideInput[] = carouselPlan.slides.map((planSlide) => {
    const compositionId = selectComposition({
      format: "carousel",
      headline: planSlide.headline,
      body: planSlide.body,
      mediaType: planSlide.mediaType,
      order: planSlide.order,
      total: totalSlides,
    });
    const layout = getComposition(template, "carousel", compositionId);

    const content: FrameContent = {
      category: carouselPlan.category,
      headline: planSlide.headline,
      body: planSlide.body,
      cta: planSlide.cta,
      progress: `${planSlide.order} / ${totalSlides}`,
    };

    return {
      layout,
      content,
      mediaDataUrl: mediaAssetToDataUrl(mediaBySlideOrder.get(planSlide.order) ?? null),
    };
  });

  return buildCarouselPptx({
    slides,
    logoDataUrl: brandProfile.logos.primary ?? null,
    brand: brandProfile,
    brandLabel: brandKit?.name ?? "",
  });
}

/**
 * "Edit in Canva" — builds a `.pptx` from this creation's current
 * layout/content (Post: one slide; Carousel: one slide per plan slide),
 * imports it as a new Canva design, and persists the result so the Review
 * page can open it. Story/Reel are not supported yet — the current
 * pipeline has no per-frame/per-scene template-family layout data shaped
 * the way Post/Carousel's does (see ABOUT.md for exactly why), so this
 * stays a clear 400 for those rather than a silently-broken attempt.
 *
 * Validation (does this creation actually have a ready-to-import plan and
 * media?) always happens *before* the Canva connection check and *before*
 * `canvaSyncStatus` is touched — a "not ready yet" response must never
 * leave the row looking like a failed Canva attempt when Canva was never
 * even contacted. This ordering is deliberately preserved from the
 * original Post-only version of this route.
 *
 * No session/user check — this app has no authentication anywhere
 * (CLAUDE.md Section 8); every route is equally open, and this one is no
 * exception. "Verify the current user" here means only what every other
 * route already means: confirm the requested Creation exists.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const creation = await prisma.creation.findUnique({
      where: { id },
      include: { project: { include: { brandKit: true } } },
    });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found." }, { status: 404 });
    }

    if (creation.contentType !== "POST" && creation.contentType !== "CAROUSEL") {
      return NextResponse.json(
        { error: "Edit in Canva is currently only available for Post and Carousel creations." },
        { status: 400 }
      );
    }

    const brandKit = creation.project?.brandKit ?? null;

    // ---- Validation phase: never touches canvaSyncStatus or Canva. ----
    let pptxBufferPromise: () => Promise<Buffer>;

    if (creation.contentType === "POST") {
      if (!creation.postPlanId) {
        return NextResponse.json(
          { error: "This post hasn't been generated through the current pipeline yet." },
          { status: 400 }
        );
      }

      const postPlan = await getPostPlanById(creation.postPlanId);
      if (!postPlan) {
        return NextResponse.json({ error: "This post's layout could not be loaded." }, { status: 404 });
      }

      const postMedia = await prisma.postMedia.findUnique({
        where: { postPlanId: creation.postPlanId },
        include: { mediaAsset: true },
      });

      if (!postMedia || postMedia.status !== "COMPLETED") {
        return NextResponse.json(
          { error: "This post's image hasn't finished generating yet — try again once it's ready." },
          { status: 400 }
        );
      }

      const mediaDataUrl = mediaAssetToDataUrl(postMedia.mediaAsset);
      pptxBufferPromise = () => buildPostPptxBuffer(postPlan.data, mediaDataUrl, brandKit);
    } else {
      if (!creation.carouselPlanId) {
        return NextResponse.json(
          { error: "This carousel hasn't been generated through the current pipeline yet." },
          { status: 400 }
        );
      }

      const carouselPlan = await getCarouselPlanById(creation.carouselPlanId);
      if (!carouselPlan) {
        return NextResponse.json({ error: "This carousel's plan could not be loaded." }, { status: 404 });
      }

      const slideMediaRows = await prisma.carouselSlideMedia.findMany({
        where: { carouselPlanId: creation.carouselPlanId },
        include: { mediaAsset: true },
      });

      // Unlike Post, a Carousel is allowed to proceed with some slides'
      // media still missing/failed — each becomes a placeholder page (see
      // buildCarouselPptxBuffer's doc comment) rather than blocking the
      // whole deck. Only block if *no* plan slides exist at all, which
      // schema validation already guarantees can't happen for a real plan.
      const mediaBySlideOrder = new Map(slideMediaRows.map((row) => [row.slideOrder, row.mediaAsset]));
      pptxBufferPromise = () => buildCarouselPptxBuffer(carouselPlan.data, mediaBySlideOrder, brandKit);
    }

    // ---- Canva phase: connection check, then the actual import. ----
    let accessToken: string;
    try {
      accessToken = await getCanvaAccessToken();
    } catch (error) {
      if (error instanceof CanvaApiError && (error.code === "not_connected" || error.code === "reconnect_required")) {
        // Safe, expected response the UI uses to kick off the existing
        // Canva OAuth flow (`/api/canva/connect`) — not a second OAuth
        // implementation, just a signal.
        return NextResponse.json({ error: error.message, needsConnect: true }, { status: 409 });
      }
      throw error;
    }

    await prisma.creation.update({ where: { id }, data: { canvaSyncStatus: "IMPORTING" } });

    let imported;
    try {
      const pptxBuffer = await pptxBufferPromise();
      imported = await importDesign(accessToken, pptxBuffer, creation.title);
    } catch (error) {
      await prisma.creation.update({ where: { id }, data: { canvaSyncStatus: "FAILED" } });

      if (error instanceof CanvaApiError) {
        console.error(`[Canva] Design import failed for creation ${id}:`, error);
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
      throw error;
    }

    await prisma.creation.update({
      where: { id },
      data: {
        canvaDesignId: imported.designId,
        canvaEditUrl: imported.editUrl,
        canvaViewUrl: imported.viewUrl,
        canvaSyncStatus: "EDITING",
      },
    });

    return NextResponse.json({ success: true, editUrl: imported.editUrl });
  } catch (error) {
    console.error(`Failed to create Canva design for creation ${id}:`, error);
    return NextResponse.json({ error: "Unable to open this creation in Canva right now." }, { status: 500 });
  }
}
