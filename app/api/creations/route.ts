import { NextResponse } from "next/server";
import { ContentType, type Prisma } from "@prisma/client";
import { z } from "zod";

import { AIServiceError, generateEvaluation } from "@/lib/ai";
import { loadBrandContext } from "@/lib/brand-kit/load-context";
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
  researchId: z.string().trim().min(1).optional(),
  plannerId: z.string().trim().min(1).optional(),
  visualPromptId: z.string().trim().min(1).optional(),
});

/**
 * AI Quality Score + AI Suggestions — runs once, at save time, against the
 * finished content. Best-effort: a failure here (e.g. Gemini unavailable)
 * must never block saving the creation, matching the existing Brand Kit
 * context resilience pattern.
 */
async function evaluateCreation(
  caption: string,
  hashtags: unknown,
  projectId: string | null
): Promise<{ qualityScore: Prisma.InputJsonValue | undefined; suggestions: Prisma.InputJsonValue | undefined }> {
  try {
    const { context: brandContext } = await loadBrandContext(projectId);
    const normalizedHashtags = Array.isArray(hashtags) ? (hashtags as string[]) : [];

    const evaluation = await generateEvaluation(
      { caption, hashtags: normalizedHashtags },
      brandContext
    );

    return {
      qualityScore: evaluation.scores as unknown as Prisma.InputJsonValue,
      suggestions: evaluation.suggestions as unknown as Prisma.InputJsonValue,
    };
  } catch (error) {
    console.error("Failed to evaluate creation:", error instanceof AIServiceError ? error.message : error);
    return { qualityScore: undefined, suggestions: undefined };
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
