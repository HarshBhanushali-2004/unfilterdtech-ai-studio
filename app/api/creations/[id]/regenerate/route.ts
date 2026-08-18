import { NextResponse } from "next/server";
import { ContentType, Prisma } from "@prisma/client";

import {
  AIServiceError,
  buildInstagramContentPrompt,
  generateInstagramContent,
  generatedInstagramContentSchema,
  visualPromptObjectSchema,
  type AIContentType,
} from "@/lib/ai";
import { loadBrandContext } from "@/lib/brand-kit/load-context";
import { evaluateCreation } from "@/lib/creation-evaluation";
import { generateImagesForCreation } from "@/lib/image-generation/generate-for-creation";
import { getOrCreatePlanner } from "@/lib/planner/service";
import { prisma } from "@/lib/prisma";
import { getOrCreateResearch } from "@/lib/research/service";
import { getOrCreateVisualPrompt } from "@/lib/visual-prompt/service";
import { getOrCreateCarouselPlan } from "@/lib/carousel-plan/service";
import { generateMediaForCarouselPlan } from "@/lib/carousel-plan/generate-media-for-plan";
import { getOrCreatePostPlan } from "@/lib/post-plan/service";
import { generateMediaForPostPlan } from "@/lib/post-plan/generate-media-for-plan";
import { getOrCreateStoryPlan } from "@/lib/story-plan/service";
import { generateMediaForStoryPlan } from "@/lib/story-plan/generate-media-for-plan";
import { getOrCreateReelPlan } from "@/lib/reel-plan/service";
import { generateMediaForReelPlan } from "@/lib/reel-plan/generate-media-for-plan";
import { resolveAudioForReel } from "@/lib/audio-resolver/service";

export const runtime = "nodejs";
// See app/api/creations/route.ts's matching comment — Regenerate reruns the
// full pipeline (Research → Planner → Carousel Plan → per-slide media) and
// is even more likely to exceed the default serverless timeout than a
// first save.
export const maxDuration = 120;

type RouteContext = {
  params: Promise<{ id: string }>;
};

const apiContentTypeByContentType: Record<ContentType, AIContentType> = {
  POST: "instagram_post",
  CAROUSEL: "carousel",
  STORY: "story",
  REEL: "reel",
};

/**
 * "Regenerate" — the Review page's one-click, no-questions-asked action.
 * Reruns the entire pipeline (Research → Planner → Visual Prompt → Content
 * → Images) for an already-saved Creation, forcing every stage fresh
 * (`forceRegenerate: true`) rather than reusing the cached Research/
 * Planner/VisualPrompt rows — those rows are a *cross-creation* cache
 * keyed by (topic) / (research+brandKit+tone+creativity) / (planner+
 * brandKit), so simply calling the normal `getOrCreateX` functions again
 * would almost always hit the same cache entry and return byte-identical
 * content, or worse, silently overwrite what another Creation sharing that
 * cache key is showing. Forced regeneration always creates new rows and
 * repoints this Creation at them; the old rows are left untouched for
 * whoever else references them.
 *
 * `sourceType` isn't persisted on `Creation` (only the raw `prompt` text
 * is) — regeneration always treats it as `"topic"`. That only affects one
 * descriptive line in the generation prompt ("Source type: ..."), not the
 * source text itself, so the approximation is low-risk.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const creation = await prisma.creation.findUnique({ where: { id } });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found." }, { status: 404 });
    }

    const tone = creation.tone ?? "confident";
    const creativity = creation.creativity ?? 55;

    const { context: brandContext, brandKitId } = await loadBrandContext(creation.projectId);

    const research = await getOrCreateResearch(creation.prompt, { forceRegenerate: true });

    const planner = await getOrCreatePlanner(
      {
        researchId: research.id,
        research: research.data,
        brandKitId,
        brandContext,
        tone,
        creativity,
      },
      { forceRegenerate: true }
    );

    const visualPrompt = await getOrCreateVisualPrompt(
      {
        plannerId: planner.id,
        planner: planner.data,
        research: research.data,
        brandKitId,
        brandContext,
      },
      { forceRegenerate: true }
    );

    const prompt = buildInstagramContentPrompt(
      {
        sourceType: "topic",
        input: creation.prompt,
        contentTypes: [apiContentTypeByContentType[creation.contentType]],
        tone,
        creativity,
      },
      research.data,
      planner.data,
      brandContext
    );

    const generatedContent = await generateInstagramContent(prompt);
    const outputValidation = generatedInstagramContentSchema.safeParse(generatedContent);

    if (!outputValidation.success) {
      return NextResponse.json({ error: "Regenerated content could not be validated." }, { status: 502 });
    }

    const { qualityScore, suggestions } = await evaluateCreation(
      outputValidation.data.caption,
      outputValidation.data.hashtags,
      creation.projectId
    );

    // Carousel Plan step — Phase 1's AI Carousel Engine (see AGENTS.md).
    // Only for CAROUSEL creations that already went through the new
    // pipeline (have a carouselPlanId); a pre-Phase-1 CAROUSEL creation has
    // none and keeps falling through to the legacy per-slide image
    // regeneration below, same as before this feature existed.
    const carouselPlan =
      creation.contentType === "CAROUSEL" && creation.carouselPlanId
        ? await getOrCreateCarouselPlan(
            {
              topic: creation.prompt,
              plannerId: planner.id,
              planner: planner.data,
              research: research.data,
              brandKitId,
              brandContext,
            },
            { forceRegenerate: true }
          )
        : null;

    // Post Plan step — Phase 1C's Instagram Single Post content type (see
    // AGENTS.md). Same "only for creations already on the new pipeline"
    // reasoning as the Carousel Plan branch above.
    const postPlan =
      creation.contentType === "POST" && creation.postPlanId
        ? await getOrCreatePostPlan(
            {
              topic: creation.prompt,
              plannerId: planner.id,
              planner: planner.data,
              research: research.data,
              brandKitId,
              brandContext,
            },
            { forceRegenerate: true }
          )
        : null;

    // Story Plan step — Phase 1C's Instagram Story content type (see
    // AGENTS.md). Same reasoning as the Carousel/Post Plan branches above.
    const storyPlan =
      creation.contentType === "STORY" && creation.storyPlanId
        ? await getOrCreateStoryPlan(
            {
              topic: creation.prompt,
              plannerId: planner.id,
              planner: planner.data,
              research: research.data,
              brandKitId,
              brandContext,
            },
            { forceRegenerate: true }
          )
        : null;

    // Reel Plan step — Phase 1C's Instagram Reel content type (see
    // AGENTS.md). Same reasoning as the other Plan branches above.
    const reelPlan =
      creation.contentType === "REEL" && creation.reelPlanId
        ? await getOrCreateReelPlan(
            {
              topic: creation.prompt,
              plannerId: planner.id,
              planner: planner.data,
              research: research.data,
              brandKitId,
              brandContext,
            },
            { forceRegenerate: true }
          )
        : null;

    await prisma.creation.update({
      where: { id },
      data: {
        researchId: research.id,
        plannerId: planner.id,
        visualPromptId: visualPrompt.id,
        carouselPlanId: carouselPlan?.id ?? creation.carouselPlanId,
        postPlanId: postPlan?.id ?? creation.postPlanId,
        storyPlanId: storyPlan?.id ?? creation.storyPlanId,
        reelPlanId: reelPlan?.id ?? creation.reelPlanId,
        caption: outputValidation.data.caption,
        hashtags: outputValidation.data.hashtags,
        carousel: outputValidation.data.carousel,
        story: outputValidation.data.story,
        reel: outputValidation.data.reel,
        qualityScore: qualityScore ?? Prisma.JsonNull,
        suggestions: suggestions ?? Prisma.JsonNull,
      },
    });

    // Media/images last — every text field a reviewer looks at first is
    // already saved even if generation runs long or a provider call fails.
    if (carouselPlan) {
      // New system is the source of truth for CAROUSEL — regenerate every
      // slide's resolved media + rendered image, skip the legacy
      // per-VisualPrompt-slot image path entirely (it would just burn
      // duplicate Gemini image calls no Review page surface shows anymore).
      const project = creation.projectId
        ? await prisma.project.findUnique({ where: { id: creation.projectId }, include: { brandKit: true } })
        : null;

      await generateMediaForCarouselPlan({
        carouselPlanId: carouselPlan.id,
        plan: carouselPlan.data,
        brandKit: project?.brandKit ?? null,
        forceRegenerate: true,
      });
    } else if (postPlan) {
      // New system is the source of truth for POST — same reasoning as the
      // CAROUSEL branch above.
      const project = creation.projectId
        ? await prisma.project.findUnique({ where: { id: creation.projectId }, include: { brandKit: true } })
        : null;

      await generateMediaForPostPlan({
        postPlanId: postPlan.id,
        plan: postPlan.data,
        brandKit: project?.brandKit ?? null,
        forceRegenerate: true,
      });

      // Phase 2 data-safety guard (see CANVA_NEXT_PHASE_PLAN.md §11/§12):
      // the image just generated above overwrites PostMedia.renderedImageUrl
      // unconditionally, same as it always has — so any existing Canva
      // link/edit is now stale relative to the new content. Clear it rather
      // than leave `canvaSyncStatus: EDITING`/`SYNCED` silently pointing at
      // an orphaned design as if it still matched what's on screen. The
      // client-side confirmation before calling this route at all
      // (`ReviewActionBar`) is the actual "don't silently destroy Canva
      // work" warning; this is the server-side half — honest state, not a
      // prevention.
      await prisma.creation.update({
        where: { id },
        data: {
          canvaDesignId: null,
          canvaEditUrl: null,
          canvaViewUrl: null,
          canvaLastSyncedAt: null,
          canvaSyncStatus: "NOT_LINKED",
        },
      });
    } else if (storyPlan) {
      const project = creation.projectId
        ? await prisma.project.findUnique({ where: { id: creation.projectId }, include: { brandKit: true } })
        : null;

      await generateMediaForStoryPlan({
        storyPlanId: storyPlan.id,
        plan: storyPlan.data,
        brandKit: project?.brandKit ?? null,
        forceRegenerate: true,
      });
    } else if (reelPlan) {
      const project = creation.projectId
        ? await prisma.project.findUnique({ where: { id: creation.projectId }, include: { brandKit: true } })
        : null;

      await generateMediaForReelPlan({
        reelPlanId: reelPlan.id,
        plan: reelPlan.data,
        brandKit: project?.brandKit ?? null,
        forceRegenerate: true,
      });

      const { audioAssetId } = await resolveAudioForReel(reelPlan.id, reelPlan.data);
      await prisma.creation.update({ where: { id }, data: { audioAssetId } });
    } else {
      const parsedVisualPrompt = visualPromptObjectSchema.safeParse(visualPrompt.data);
      if (parsedVisualPrompt.success) {
        await generateImagesForCreation({
          visualPromptId: visualPrompt.id,
          visualPrompt: parsedVisualPrompt.data,
          contentType: creation.contentType,
          forceRegenerate: true,
        });
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (error instanceof AIServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to regenerate creation:", error);

    return NextResponse.json({ error: "Unable to regenerate this creation right now." }, { status: 500 });
  }
}
