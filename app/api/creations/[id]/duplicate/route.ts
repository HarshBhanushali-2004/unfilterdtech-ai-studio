import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const original = await prisma.creation.findUnique({ where: { id } });

    if (!original) {
      return NextResponse.json(
        { error: "Creation not found." },
        { status: 404 }
      );
    }

    const duplicate = await prisma.creation.create({
      data: {
        projectId: original.projectId,
        title: `${original.title} (Copy)`.slice(0, 190),
        prompt: original.prompt,
        contentType: original.contentType,
        tone: original.tone,
        creativity: original.creativity,
        caption: original.caption,
        hashtags: original.hashtags ?? Prisma.JsonNull,
        carousel: original.carousel ?? Prisma.JsonNull,
        story: original.story ?? Prisma.JsonNull,
        reel: original.reel ?? Prisma.JsonNull,
        model: original.model,
      },
    });

    return NextResponse.json({ success: true, id: duplicate.id });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to duplicate creation" },
      { status: 500 }
    );
  }
}
