import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCanvaAccessToken } from "@/lib/canva/auth";
import { CanvaApiError } from "@/lib/canva/errors";
import { exportDesignAsPng } from "@/lib/canva/export";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * "Sync back from Canva" (Phase 2 — see CANVA_NEXT_PHASE_PLAN.md §4/§9).
 * Exports the linked Canva design as a PNG and persists it as this Post's
 * new `renderedImageUrl` — the same data-URL persistence pattern every
 * other rendered image in this schema already uses (no object storage
 * configured for this project, see CLAUDE.md).
 *
 * The AI-generated version is never touched until the export has fully
 * succeeded and the new image bytes are in hand — a failed/slow export
 * leaves the previously-rendered image exactly as it was, with
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
        { error: "This post isn't linked to a Canva design yet." },
        { status: 400 }
      );
    }

    if (!creation.postPlanId) {
      return NextResponse.json({ error: "This post has no image to update." }, { status: 400 });
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

    let pngBuffer: Buffer;
    try {
      pngBuffer = await exportDesignAsPng(accessToken, creation.canvaDesignId);
    } catch (error) {
      // Preserve the existing image — only the status changes.
      await prisma.creation.update({ where: { id }, data: { canvaSyncStatus: "FAILED" } });

      if (error instanceof CanvaApiError) {
        console.error(`[Canva] Export failed for creation ${id}:`, error);
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
      throw error;
    }

    const renderedImageUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;

    // Only reached after a successful export — the previous image is
    // overwritten in the same transaction-adjacent pair of writes that
    // already updates canvaSyncStatus, never before.
    await prisma.$transaction([
      prisma.postMedia.update({
        where: { postPlanId: creation.postPlanId },
        data: { renderedImageUrl },
      }),
      prisma.creation.update({
        where: { id },
        data: { canvaSyncStatus: "SYNCED", canvaLastSyncedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to sync Canva design for creation ${id}:`, error);
    return NextResponse.json({ error: "Unable to sync back from Canva right now." }, { status: 500 });
  }
}
