import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCanvaAccessToken } from "@/lib/canva/auth";
import { CanvaApiError } from "@/lib/canva/errors";
import { exportDesignAsPng, exportDesignPages } from "@/lib/canva/export";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * "Sync back from Canva" — exports the linked Canva design and persists the
 * result as this creation's new media, replacing whatever the AI last
 * rendered:
 * - **Post**: one PNG → `PostMedia.renderedImageUrl` (unchanged from the
 *   original Post-only version of this route).
 * - **Carousel**: one PNG per page → each `CarouselSlideMedia.renderedImageUrl`,
 *   mapped back to its slide by Canva's own documented page order ("sorted
 *   by page order", matching the order `buildCarouselPptx` wrote the deck
 *   in) — page 1 is slide 1, page 2 is slide 2, and so on.
 *
 * The AI-generated version is never touched until the export has fully
 * succeeded and the new image bytes are in hand — a failed/slow export
 * leaves the previously-rendered image(s) exactly as they were, with
 * `canvaSyncStatus` set to `FAILED` so the UI can say so.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const creation = await prisma.creation.findUnique({ where: { id } });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found." }, { status: 404 });
    }

    if (!creation.canvaDesignId) {
      return NextResponse.json(
        { error: "This creation isn't linked to a Canva design yet." },
        { status: 400 }
      );
    }

    if (creation.contentType !== "POST" && creation.contentType !== "CAROUSEL") {
      return NextResponse.json(
        { error: "Syncing from Canva is currently only available for Post and Carousel creations." },
        { status: 400 }
      );
    }

    if (creation.contentType === "POST" && !creation.postPlanId) {
      return NextResponse.json({ error: "This post has no image to update." }, { status: 400 });
    }

    if (creation.contentType === "CAROUSEL" && !creation.carouselPlanId) {
      return NextResponse.json({ error: "This carousel has no slides to update." }, { status: 400 });
    }

    let accessToken: string;
    try {
      accessToken = await getCanvaAccessToken();
    } catch (error) {
      if (error instanceof CanvaApiError && (error.code === "not_connected" || error.code === "reconnect_required")) {
        return NextResponse.json({ error: error.message, needsConnect: true }, { status: 409 });
      }
      throw error;
    }

    await prisma.creation.update({ where: { id }, data: { canvaSyncStatus: "EXPORTING" } });

    try {
      if (creation.contentType === "POST") {
        const pngBuffer = await exportDesignAsPng(accessToken, creation.canvaDesignId);
        const renderedImageUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;

        // Only reached after a successful export — the previous image is
        // overwritten in the same transaction-adjacent pair of writes that
        // already updates canvaSyncStatus, never before.
        await prisma.$transaction([
          prisma.postMedia.update({
            where: { postPlanId: creation.postPlanId! },
            // status/errorCode/errorMessage reset alongside the image: Edit
            // in Canva already required this row to be COMPLETED before it
            // would even open (see create/route.ts), so this is a no-op in
            // practice for Post — kept for the same reason as the Carousel
            // branch below: never leave a stale FAILED/error pair sitting
            // next to a just-synced, actually-viewable image.
            data: { renderedImageUrl, status: "COMPLETED", errorCode: null, errorMessage: null },
          }),
          prisma.creation.update({
            where: { id },
            data: { canvaSyncStatus: "SYNCED", canvaLastSyncedAt: new Date() },
          }),
        ]);
      } else {
        const pageBuffers = await exportDesignPages(accessToken, creation.canvaDesignId);

        const slideRows = await prisma.carouselSlideMedia.findMany({
          where: { carouselPlanId: creation.carouselPlanId! },
          orderBy: { slideOrder: "asc" },
        });

        // Canva returns pages "sorted by page order" — page N corresponds
        // to the Nth slide in the deck we built (buildCarouselPptx wrote
        // one slide per plan slide, in slideOrder). A page-count mismatch
        // (e.g. the user added/removed a page inside Canva itself) is
        // handled by only updating as many slides as we have pages for —
        // never guessing, never writing a page to the wrong slide.
        //
        // status is force-set to COMPLETED here (and any stale error
        // cleared) — unlike Post, Carousel's "Edit in Canva" deliberately
        // allows slides whose media generation FAILED to be included (as a
        // placeholder page — see create/route.ts's doc comment), so a slide
        // synced back from Canva can be moving FAILED -> viewable for the
        // first time. Without this, `CarouselSlidesGallery`'s
        // `status === "COMPLETED"` gate (see that component) would keep
        // showing "Media unavailable" over a slide that now has a perfectly
        // good, just-synced image sitting right next to it in the same row.
        const updates = pageBuffers.slice(0, slideRows.length).map((buffer, index) =>
          prisma.carouselSlideMedia.update({
            where: { id: slideRows[index].id },
            data: {
              renderedImageUrl: `data:image/png;base64,${buffer.toString("base64")}`,
              status: "COMPLETED",
              errorCode: null,
              errorMessage: null,
            },
          })
        );

        await prisma.$transaction([
          ...updates,
          prisma.creation.update({
            where: { id },
            data: { canvaSyncStatus: "SYNCED", canvaLastSyncedAt: new Date() },
          }),
        ]);
      }
    } catch (error) {
      // Preserve the existing image(s) — only the status changes.
      await prisma.creation.update({ where: { id }, data: { canvaSyncStatus: "FAILED" } });

      if (error instanceof CanvaApiError) {
        console.error(`[Canva] Export failed for creation ${id}:`, error);
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to sync Canva design for creation ${id}:`, error);
    return NextResponse.json({ error: "Unable to sync back from Canva right now." }, { status: 500 });
  }
}
