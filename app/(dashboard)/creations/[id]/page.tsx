import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { CreationActions } from "@/components/creations/creation-actions";
import { CreationBreadcrumbs } from "@/components/creations/creation-breadcrumbs";
import { DeveloperDetails } from "@/components/creations/developer-details";
import { GeneratedContentSections } from "@/components/creations/generated-content-sections";
import { GeneratedImagesGallery } from "@/components/creations/generated-images-gallery";
import { HashtagsCard } from "@/components/creations/hashtags-card";
import { PostCard } from "@/components/creations/post-card";
import { PostMediaPreview } from "@/components/creations/post-media-preview";
import { ReviewActionBar } from "@/components/creations/review-action-bar";
import { BrandKitBadge } from "@/components/brand-kit/brand-kit-badge";
import { formatDate } from "@/lib/format-date";
import {
  researchObjectSchema,
  plannerObjectSchema,
  qualityScoreSchema,
  suggestionSchema,
  visualPromptObjectSchema,
} from "@/lib/ai";
import { z } from "zod";
import type { CarouselSlide, StoryFrame, ReelContent } from "@/lib/ai/types";

/**
 * Resolves which top-level section this creation is being viewed "through" —
 * Projects or History — the single source of truth for both the sidebar's
 * active item and the breadcrumb trail. Trusts an explicit `?from=history`
 * (a creation can belong to a project and still be reached via History),
 * otherwise defaults to Projects if the creation has one, History if it
 * doesn't. Never trusts `?from=projects` on a project-less creation — there
 * would be nothing to link to.
 */
function resolveOrigin(requestedFrom: string | undefined, hasProject: boolean): "projects" | "history" {
  if (requestedFrom === "history") return "history";
  return hasProject ? "projects" : "history";
}

export default async function CreationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from: requestedFrom } = await searchParams;

  const creation = await prisma.creation.findUnique({
    where: {
      id,
    },
    include: {
      project: {
        include: {
          brandKit: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      research: true,
      planner: true,
      visualPrompt: true,
      carouselPlan: true,
    },
  });

  if (!creation) {
    notFound();
  }

  const origin = resolveOrigin(requestedFrom, !!creation.project);

  // Canonicalize the URL so it always carries the resolved origin — the
  // sidebar (a client component with no access to `creation.project`) reads
  // `?from=` back to decide which nav item to highlight, so this is the
  // only source of truth for both it and the breadcrumb trail below.
  if (requestedFrom !== origin) {
    redirect(`/creations/${id}?from=${origin}`);
  }

  const redirectTo =
    origin === "history"
      ? "/history"
      : creation.project
        ? `/projects/${creation.project.id}`
        : "/projects";

  const hashtags = Array.isArray(creation.hashtags)
    ? (creation.hashtags as string[])
    : [];
  const carousel = Array.isArray(creation.carousel)
    ? (creation.carousel as unknown as CarouselSlide[])
    : null;
  const story = Array.isArray(creation.story)
    ? (creation.story as unknown as StoryFrame[])
    : null;
  const reel = creation.reel ? (creation.reel as unknown as ReelContent) : null;

  const research = creation.research
    ? researchObjectSchema.safeParse(creation.research.data)
    : null;

  const planner = creation.planner
    ? plannerObjectSchema.safeParse(creation.planner.data)
    : null;

  const qualityScore = creation.qualityScore
    ? qualityScoreSchema.safeParse(creation.qualityScore)
    : null;

  const suggestions = creation.suggestions
    ? z.array(suggestionSchema).safeParse(creation.suggestions)
    : null;

  const visualPrompt = creation.visualPrompt
    ? visualPromptObjectSchema.safeParse(creation.visualPrompt.data)
    : null;

  return (
    <div className="space-y-8 pb-4">
      <CreationBreadcrumbs
        origin={origin}
        project={creation.project ? { id: creation.project.id, name: creation.project.name } : null}
        creationTitle={creation.title}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            {creation.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{creation.contentType}</span>

            <span>•</span>

            <span>
              {formatDate(creation.createdAt)}
            </span>

            {creation.project?.brandKit && (
              <>
                <span>•</span>
                <BrandKitBadge name={creation.project.brandKit.name} />
              </>
            )}
          </div>
        </div>

        <CreationActions
          creation={{
            id: creation.id,
            title: creation.title,
            caption: creation.caption,
            prompt: creation.prompt,
            hashtags,
            carousel,
            story,
            reel,
          }}
          carouselPlanId={creation.carouselPlanId}
          postPlanId={creation.postPlanId}
          storyPlanId={creation.storyPlanId}
        />
      </div>

      {/* Review page: Generated Content → Generated Images → Hashtags → Publishing Preview */}
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Generated Content</h2>
          <GeneratedContentSections
            caption={creation.caption}
            hashtags={hashtags}
            carousel={carousel}
            story={story}
            reel={reel}
            carouselPlanId={creation.carouselPlanId}
            storyPlanId={creation.storyPlanId}
            reelPlanId={creation.reelPlanId}
            tabs={["caption", "carousel", "stories", "reel"]}
          />
        </section>

        {/* For a Phase 1/1C creation made through the Carousel or Post Planner (carouselPlanId/postPlanId set), the rendered media shown in the "Carousel" tab or "Publishing Preview" section below is this creation's media — a second, separately-populated image gallery here would just be an empty, confusing duplicate (see AGENTS.md's Template Renderer). */}
        {!creation.carouselPlanId && !creation.postPlanId && !creation.storyPlanId && !creation.reelPlanId && (
          <section className="space-y-4 rounded-2xl border p-5 md:p-6">
            <h2 className="text-lg font-semibold">Generated Images</h2>
            <GeneratedImagesGallery visualPromptId={creation.visualPromptId} />
          </section>
        )}

        {hashtags.length > 0 && (
          <section className="space-y-4 rounded-2xl border p-5 md:p-6">
            <h2 className="text-lg font-semibold">Hashtags</h2>
            <HashtagsCard hashtags={hashtags} />
          </section>
        )}

        <section className="space-y-4 rounded-2xl border p-5 md:p-6">
          <h2 className="text-lg font-semibold">Publishing Preview</h2>
          {creation.postPlanId && <PostMediaPreview postPlanId={creation.postPlanId} />}
          <PostCard caption={creation.caption} hashtags={hashtags} />
        </section>

        <DeveloperDetails
          prompt={creation.prompt}
          research={research?.success ? research.data : null}
          planner={planner?.success ? planner.data : null}
          qualityScore={qualityScore?.success ? qualityScore.data : null}
          suggestions={suggestions?.success ? suggestions.data : null}
          visualPromptId={creation.visualPromptId}
          visualPrompt={visualPrompt?.success ? visualPrompt.data : null}
        />
      </div>

      <ReviewActionBar
        creationId={creation.id}
        status={creation.status}
        scheduledAt={creation.scheduledAt?.toISOString() ?? null}
        deleteRedirectTo={redirectTo}
      />
    </div>
  );
}
