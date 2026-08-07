import { NextResponse } from "next/server";
import { ContentType } from "@prisma/client";
import { z } from "zod";

import { visualPromptObjectSchema } from "@/lib/ai";
import { evaluateCreation } from "@/lib/creation-evaluation";
import { generateImagesForCreation } from "@/lib/image-generation/generate-for-creation";
import { prisma } from "@/lib/prisma";
import { formatZodError } from "@/lib/validation";

export const runtime = "nodejs";

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
  researchId: z.string().trim().min(1).optional(),
  plannerId: z.string().trim().min(1).optional(),
  visualPromptId: z.string().trim().min(1).optional(),
});

/**
 * Kicks off image generation for every slot the creation's content type
 * needs (Feature: "AI generates everything" — the Review page's "Generated
 * Images" section is meant to already be populated by the time a creator
 * looks at it, not something they trigger manually). Best-effort like
 * `evaluateCreation`: a Gemini image failure must never block the save
 * itself — `generateImagesForCreation`/`generateImageForSlot` already
 * persist a per-slot FAILED status rather than throwing, so this only
 * catches something more fundamental (e.g. the visual prompt row missing).
 */
async function generateImagesForNewCreation(
  visualPromptId: string | undefined,
  contentType: ContentType
): Promise<void> {
  if (!visualPromptId) return;

  try {
    const visualPrompt = await prisma.visualPrompt.findUnique({ where: { id: visualPromptId } });
    if (!visualPrompt) return;

    const parsed = visualPromptObjectSchema.safeParse(visualPrompt.data);
    if (!parsed.success) return;

    await generateImagesForCreation({
      visualPromptId,
      visualPrompt: parsed.data,
      contentType,
      forceRegenerate: false,
    });
  } catch (error) {
    console.error("Failed to generate images for creation:", error);
  }
}

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
    const projectId: string | null = body.projectId ?? null;

    const { qualityScore, suggestions } = await evaluateCreation(
      validation.data.caption,
      body.hashtags,
      projectId
    );

    const creation = await prisma.creation.create({
      data: {
        projectId,
        researchId: validation.data.researchId ?? null,
        plannerId: validation.data.plannerId ?? null,
        visualPromptId: validation.data.visualPromptId ?? null,

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

        qualityScore,
        suggestions,

        model: body.model ?? "Gemini",
      },
    });

    await generateImagesForNewCreation(validation.data.visualPromptId, contentType);

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
