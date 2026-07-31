import { NextResponse } from "next/server";
import { ContentType } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { formatZodError } from "@/lib/validation";

const contentTypeMap: Record<string, ContentType> = {
  post: ContentType.POST,
  carousel: ContentType.CAROUSEL,
  story: ContentType.STORY,
  reel: ContentType.REEL,
};

const createCreationSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  prompt: z.string().trim().min(1, "Prompt is required."),
  caption: z.string().trim().min(1, "Caption is required."),
  contentType: z.string().refine((value) => value in contentTypeMap, {
    message: `Invalid contentType. Expected one of: ${Object.keys(
      contentTypeMap
    ).join(", ")}.`,
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = createCreationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const contentType = contentTypeMap[validation.data.contentType];

    const creation = await prisma.creation.create({
      data: {
        projectId: body.projectId ?? null,

        title: validation.data.title,
        prompt: validation.data.prompt,

        contentType,

        tone: body.tone,
        creativity: body.creativity,

        caption: validation.data.caption,

        hashtags: body.hashtags,
        carousel: body.carousel,
        story: body.story,
        reel: body.reel,

        model: body.model ?? "Gemini",
      },
    });

    return NextResponse.json({
      success: true,
      id: creation.id,
    });
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