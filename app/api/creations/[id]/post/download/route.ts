import { NextResponse } from "next/server";

import { slugify } from "@/lib/creation-export";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Downloads a POST creation's rendered image directly (a single PNG, not a
 * ZIP — unlike the carousel download, there's only ever one asset). Phase
 * 1C, AGENTS.md Core Requirement #20: "Post: PNG/JPG ... Do not create
 * multiple competing download systems" — this is the second (not a third)
 * download route, following the exact pattern of
 * `/api/creations/[id]/carousel/download`.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const creation = await prisma.creation.findUnique({ where: { id } });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found." }, { status: 404 });
    }

    if (creation.contentType !== "POST" || !creation.postPlanId) {
      return NextResponse.json(
        { error: "This creation has no rendered post to download." },
        { status: 400 }
      );
    }

    const media = await prisma.postMedia.findUnique({ where: { postPlanId: creation.postPlanId } });

    if (!media || media.status !== "COMPLETED" || !media.renderedImageUrl) {
      return NextResponse.json(
        { error: "This post hasn't finished generating yet." },
        { status: 404 }
      );
    }

    const base64 = media.renderedImageUrl.split(",", 2)[1] ?? "";
    const bytes = Buffer.from(base64, "base64");

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${slugify(creation.title)}-post.png"`,
        "Content-Length": String(bytes.length),
      },
    });
  } catch (error) {
    console.error("Failed to build post download:", error);
    return NextResponse.json({ error: "Failed to build post download." }, { status: 500 });
  }
}
