import { NextResponse } from "next/server";
import { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const contentTypeMap: Record<string, ContentType> = {
  post: ContentType.POST,
  carousel: ContentType.CAROUSEL,
  story: ContentType.STORY,
  reel: ContentType.REEL,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const creation = await prisma.creation.create({
      data: {
        projectId: body.projectId ?? null,

        title: body.title,
        prompt: body.prompt,

        contentType: contentTypeMap[body.contentType],

        tone: body.tone,
        creativity: body.creativity,

        caption: body.caption,

        hashtags: body.hashtags,
        carousel: body.carousel,
        story: body.story,
        reel: body.reel,

        model: body.model ?? "Gemini",
      },
    });

    return NextResponse.json(creation);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to save creation",
      },
      {
        status: 500,
      }
    );
  }
}