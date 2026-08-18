import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * "Reset to AI Version" (Phase 2 — see CANVA_NEXT_PHASE_PLAN.md §4/§9).
 * Clears this Creation's Canva link only — `PostMedia.renderedImageUrl` is
 * never touched here. If the user never clicked "Sync back", the image was
 * never overwritten in the first place, so this is always a safe, instant,
 * no-data-loss revert; if they did sync, the synced (Canva-edited) image
 * simply stays as the current image, exactly as choosing not to revert an
 * already-applied edit would.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const creation = await prisma.creation.findUnique({ where: { id } });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found." }, { status: 404 });
    }

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to reset Canva link for creation ${id}:`, error);
    return NextResponse.json({ error: "Unable to reset the Canva link right now." }, { status: 500 });
  }
}
