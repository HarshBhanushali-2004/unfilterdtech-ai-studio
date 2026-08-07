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

export const runtime = "nodejs";

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

    await prisma.creation.update({
      where: { id },
      data: {
        researchId: research.id,
        plannerId: planner.id,
        visualPromptId: visualPrompt.id,
        caption: outputValidation.data.caption,
        hashtags: outputValidation.data.hashtags,
        carousel: outputValidation.data.carousel,
        story: outputValidation.data.story,
        reel: outputValidation.data.reel,
        qualityScore: qualityScore ?? Prisma.JsonNull,
        suggestions: suggestions ?? Prisma.JsonNull,
      },
    });

    // Images last — every text field a reviewer looks at first is already
    // saved even if image generation runs long or a provider call fails.
    const parsedVisualPrompt = visualPromptObjectSchema.safeParse(visualPrompt.data);
    if (parsedVisualPrompt.success) {
      await generateImagesForCreation({
        visualPromptId: visualPrompt.id,
        visualPrompt: parsedVisualPrompt.data,
        contentType: creation.contentType,
        forceRegenerate: true,
      });
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
