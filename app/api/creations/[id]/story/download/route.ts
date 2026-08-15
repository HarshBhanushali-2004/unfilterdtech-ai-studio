import { NextResponse } from "next/server";

import { slugify } from "@/lib/creation-export";
import { prisma } from "@/lib/prisma";
import { buildZip } from "@/lib/zip";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Downloads a STORY creation's rendered frames as `frame-01.png`,
 * `frame-02.png`, ... inside a ZIP — the multi-frame counterpart to
 * `/api/creations/[id]/carousel/download` (Phase 1C, AGENTS.md §20: "Story:
 * ZIP for multi-frame story"), reusing the same `buildZip` helper rather
 * than a second ZIP implementation.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const creation = await prisma.creation.findUnique({ where: { id } });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found." }, { status: 404 });
    }

    if (creation.contentType !== "STORY" || !creation.storyPlanId) {
      return NextResponse.json(
        { error: "This creation has no story frames to download." },
        { status: 400 }
      );
    }

    const frames = await prisma.storyFrameMedia.findMany({
      where: { storyPlanId: creation.storyPlanId, status: "COMPLETED" },
      orderBy: { frameOrder: "asc" },
    });

    const entries = frames
      .filter((frame) => frame.renderedImageUrl)
      .map((frame) => {
        const base64 = frame.renderedImageUrl!.split(",", 2)[1] ?? "";
        return {
          name: `frame-${String(frame.frameOrder).padStart(2, "0")}.png`,
          data: Buffer.from(base64, "base64"),
        };
      });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No completed frames are available to download yet." },
        { status: 404 }
      );
    }

    const zip = buildZip(entries);

    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slugify(creation.title)}-story.zip"`,
        "Content-Length": String(zip.length),
      },
    });
  } catch (error) {
    console.error("Failed to build story download:", error);
    return NextResponse.json({ error: "Failed to build story download." }, { status: 500 });
  }
}
