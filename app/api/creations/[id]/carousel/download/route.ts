import { NextResponse } from "next/server";

import { slugify } from "@/lib/creation-export";
import { prisma } from "@/lib/prisma";
import { buildZip } from "@/lib/zip";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Downloads a CAROUSEL creation's rendered slides as `slide-01.png`,
 * `slide-02.png`, ... inside a ZIP — Phase 1B's carousel export (AGENTS.md
 * §17: "STATIC Instagram carousel slides ... If convenient, provide a ZIP
 * download"). Only COMPLETED slides are included; a slide that's still
 * generating or FAILED is silently skipped rather than blocking the whole
 * download — a reviewer downloading mid-generation gets whatever's ready,
 * not an error.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const creation = await prisma.creation.findUnique({ where: { id } });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found." }, { status: 404 });
    }

    if (creation.contentType !== "CAROUSEL" || !creation.carouselPlanId) {
      return NextResponse.json(
        { error: "This creation has no carousel slides to download." },
        { status: 400 }
      );
    }

    const slides = await prisma.carouselSlideMedia.findMany({
      where: { carouselPlanId: creation.carouselPlanId, status: "COMPLETED" },
      orderBy: { slideOrder: "asc" },
    });

    const entries = slides
      .filter((slide) => slide.renderedImageUrl)
      .map((slide) => {
        const base64 = slide.renderedImageUrl!.split(",", 2)[1] ?? "";
        return {
          name: `slide-${String(slide.slideOrder).padStart(2, "0")}.png`,
          data: Buffer.from(base64, "base64"),
        };
      });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No completed slides are available to download yet." },
        { status: 404 }
      );
    }

    const zip = buildZip(entries);

    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slugify(creation.title)}-carousel.zip"`,
        "Content-Length": String(zip.length),
      },
    });
  } catch (error) {
    console.error("Failed to build carousel download:", error);
    return NextResponse.json({ error: "Failed to build carousel download." }, { status: 500 });
  }
}
