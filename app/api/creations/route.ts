import { NextResponse } from "next/server";
import { ContentType } from "@prisma/client";
import { z } from "zod";

import { visualPromptObjectSchema } from "@/lib/ai";
import { carouselPlanObjectSchema } from "@/lib/ai/carousel-planner-schemas";
import { postPlanObjectSchema } from "@/lib/ai/post-planner-schemas";
import { storyPlanObjectSchema } from "@/lib/ai/story-planner-schemas";
import { reelPlanObjectSchema } from "@/lib/ai/reel-planner-schemas";
import { evaluateCreation } from "@/lib/creation-evaluation";
import { generateImagesForCreation } from "@/lib/image-generation/generate-for-creation";
import { generateMediaForCarouselPlan } from "@/lib/carousel-plan/generate-media-for-plan";
import { generateMediaForPostPlan } from "@/lib/post-plan/generate-media-for-plan";
import { generateMediaForStoryPlan } from "@/lib/story-plan/generate-media-for-plan";
import { generateMediaForReelPlan } from "@/lib/reel-plan/generate-media-for-plan";
import { resolveAudioForReel } from "@/lib/audio-resolver/service";
import { prisma } from "@/lib/prisma";
import { formatZodError } from "@/lib/validation";

export const runtime = "nodejs";
// Saving a CAROUSEL creation can chain several sequential/staggered Gemini
// image calls (one per slide, see generateCarouselMediaForNewCreation
// below) on top of the evaluation call — comfortably past Vercel's default
// serverless timeout. Without this, a slow save can be killed mid-flight,
// leaving some CarouselSlideMedia rows stuck in RESOLVING/RENDERING forever
// (never reaching COMPLETED or FAILED) — the "grey placeholder that never
// resolves" symptom Phase 1B was asked to fix. Vercel still clamps this to
// whatever the deployed plan actually allows (60s on Hobby); raise it
// further if that plan changes.
export const maxDuration = 120;

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
  carouselPlanId: z.string().trim().min(1).optional(),
  postPlanId: z.string().trim().min(1).optional(),
  storyPlanId: z.string().trim().min(1).optional(),
  reelPlanId: z.string().trim().min(1).optional(),
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

/**
 * Resolves + renders every slide of a Carousel Plan for a newly-saved
 * CAROUSEL creation (Phase 1 — AI Carousel Engine, see AGENTS.md) —
 * best-effort like `generateImagesForNewCreation`, so a Media Resolver/
 * Carousel Renderer failure never blocks the save itself; each slide
 * already persists its own FAILED status via
 * `generateMediaForCarouselPlan`/`resolveAndRenderSlide` rather than
 * throwing.
 */
async function generateCarouselMediaForNewCreation(
  carouselPlanId: string | undefined,
  contentType: ContentType,
  projectId: string | null
): Promise<void> {
  if (!carouselPlanId || contentType !== ContentType.CAROUSEL) return;

  try {
    const carouselPlanRecord = await prisma.carouselPlan.findUnique({ where: { id: carouselPlanId } });
    if (!carouselPlanRecord) return;

    const parsed = carouselPlanObjectSchema.safeParse(carouselPlanRecord.data);
    if (!parsed.success) return;

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId }, include: { brandKit: true } })
      : null;

    await generateMediaForCarouselPlan({
      carouselPlanId,
      plan: parsed.data,
      brandKit: project?.brandKit ?? null,
      forceRegenerate: false,
    });
  } catch (error) {
    console.error("Failed to generate carousel media for creation:", error);
  }
}

/**
 * Resolves + renders a newly-saved POST creation's single media item
 * (Phase 1C, see AGENTS.md) — best-effort like
 * `generateCarouselMediaForNewCreation`, so a Media Resolver/Template
 * Renderer failure never blocks the save itself.
 */
async function generatePostMediaForNewCreation(
  postPlanId: string | undefined,
  contentType: ContentType,
  projectId: string | null
): Promise<void> {
  if (!postPlanId || contentType !== ContentType.POST) return;

  try {
    const postPlanRecord = await prisma.postPlan.findUnique({ where: { id: postPlanId } });
    if (!postPlanRecord) return;

    const parsed = postPlanObjectSchema.safeParse(postPlanRecord.data);
    if (!parsed.success) return;

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId }, include: { brandKit: true } })
      : null;

    await generateMediaForPostPlan({
      postPlanId,
      plan: parsed.data,
      brandKit: project?.brandKit ?? null,
      forceRegenerate: false,
    });
  } catch (error) {
    console.error("Failed to generate post media for creation:", error);
  }
}

/**
 * Resolves + renders every frame of a newly-saved STORY creation's Story
 * Plan (Phase 1C, see AGENTS.md) — best-effort, mirroring
 * `generateCarouselMediaForNewCreation` exactly.
 */
async function generateStoryMediaForNewCreation(
  storyPlanId: string | undefined,
  contentType: ContentType,
  projectId: string | null
): Promise<void> {
  if (!storyPlanId || contentType !== ContentType.STORY) return;

  try {
    const storyPlanRecord = await prisma.storyPlan.findUnique({ where: { id: storyPlanId } });
    if (!storyPlanRecord) return;

    const parsed = storyPlanObjectSchema.safeParse(storyPlanRecord.data);
    if (!parsed.success) return;

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId }, include: { brandKit: true } })
      : null;

    await generateMediaForStoryPlan({
      storyPlanId,
      plan: parsed.data,
      brandKit: project?.brandKit ?? null,
      forceRegenerate: false,
    });
  } catch (error) {
    console.error("Failed to generate story media for creation:", error);
  }
}

/**
 * Resolves + renders every scene storyboard preview of a newly-saved REEL
 * creation's Reel Plan (Phase 1C, see AGENTS.md) — best-effort, mirroring
 * `generateCarouselMediaForNewCreation` exactly. Never produces a video.
 * Also resolves the reel's audio (`lib/audio-resolver/`) once scenes are in
 * — see that module's doc comment for why this almost always resolves to
 * "no track attached" today, honestly, rather than a fabricated one.
 */
async function generateReelMediaForNewCreation(
  creationId: string,
  reelPlanId: string | undefined,
  contentType: ContentType,
  projectId: string | null
): Promise<void> {
  if (!reelPlanId || contentType !== ContentType.REEL) return;

  try {
    const reelPlanRecord = await prisma.reelPlan.findUnique({ where: { id: reelPlanId } });
    if (!reelPlanRecord) return;

    const parsed = reelPlanObjectSchema.safeParse(reelPlanRecord.data);
    if (!parsed.success) return;

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId }, include: { brandKit: true } })
      : null;

    await generateMediaForReelPlan({
      reelPlanId,
      plan: parsed.data,
      brandKit: project?.brandKit ?? null,
      forceRegenerate: false,
    });

    const { audioAssetId } = await resolveAudioForReel(reelPlanId, parsed.data);
    if (audioAssetId) {
      await prisma.creation.update({ where: { id: creationId }, data: { audioAssetId } });
    }
  } catch (error) {
    console.error("Failed to generate reel scene media for creation:", error);
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
        carouselPlanId: validation.data.carouselPlanId ?? null,
        postPlanId: validation.data.postPlanId ?? null,
        storyPlanId: validation.data.storyPlanId ?? null,
        reelPlanId: validation.data.reelPlanId ?? null,

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

    // For CAROUSEL/POST creations made through the new Carousel/Post
    // Planners, the renderer below is the source of truth for their media —
    // the old per-slide VisualPrompt image path would just burn duplicate
    // Gemini image calls no Review page surface shows anymore. Any other
    // content type (or a CAROUSEL/POST creation with no plan id, e.g.
    // pre-Phase-1C data) keeps the original behavior untouched.
    const supersedesLegacyImages =
      (contentType === ContentType.CAROUSEL && validation.data.carouselPlanId) ||
      (contentType === ContentType.POST && validation.data.postPlanId) ||
      (contentType === ContentType.STORY && validation.data.storyPlanId) ||
      (contentType === ContentType.REEL && validation.data.reelPlanId);

    if (!supersedesLegacyImages) {
      await generateImagesForNewCreation(validation.data.visualPromptId, contentType);
    }
    await generateCarouselMediaForNewCreation(validation.data.carouselPlanId, contentType, projectId);
    await generatePostMediaForNewCreation(validation.data.postPlanId, contentType, projectId);
    await generateStoryMediaForNewCreation(validation.data.storyPlanId, contentType, projectId);
    await generateReelMediaForNewCreation(creation.id, validation.data.reelPlanId, contentType, projectId);

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
