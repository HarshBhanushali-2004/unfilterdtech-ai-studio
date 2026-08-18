import { notFound, redirect } from "next/navigation";
import type { ContentType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { CreationActions } from "@/components/creations/creation-actions";
import { CreationBreadcrumbs } from "@/components/creations/creation-breadcrumbs";
import { DeveloperDetails } from "@/components/creations/developer-details";
import { GeneratedContentSections } from "@/components/creations/generated-content-sections";
import { GeneratedImagesGallery } from "@/components/creations/generated-images-gallery";
import { HashtagsCard } from "@/components/creations/hashtags-card";
import { PostCard } from "@/components/creations/post-card";
import { PostContentCard } from "@/components/creations/post-content-card";
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
import { getCarouselPlanById } from "@/lib/carousel-plan/service";
import { getPostPlanById } from "@/lib/post-plan/service";
import { getStoryPlanById } from "@/lib/story-plan/service";
import { getReelPlanById } from "@/lib/reel-plan/service";
import { carouselPlanToSlides, reelPlanToReel, storyPlanToFrames } from "@/lib/creations/plan-content-views";

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

/**
 * The Review page must stay format-aware (CLAUDE.md Section 12/12c): a
 * Creation has exactly one primary `contentType`, but the legacy flat
 * `carousel`/`story`/`reel` columns on every `Creation` row are populated
 * regardless of which format was actually selected — `buildInstagramContentPrompt`
 * explicitly instructs Gemini to "populate every field, including formats
 * that were not explicitly requested" (`lib/ai/prompt-builder.ts`), purely
 * for backward-compatible Copy/Download. Showing all three format tabs
 * unconditionally (the previous behavior) meant e.g. a CAROUSEL creation
 * displayed real-looking "Stories"/"Reel" tabs full of content the user
 * never asked for and that isn't this creation's actual format — exactly
 * the "looks like every creation supports every format" confusion this
 * maps away. POST has no entry here on purpose: its content already has
 * its own dedicated "Publishing Preview" section below, not a tab.
 */
const PRIMARY_FORMAT_TAB: Record<ContentType, "carousel" | "stories" | "reel" | null> = {
  POST: null,
  CAROUSEL: "carousel",
  STORY: "stories",
  REEL: "reel",
};

export default async function CreationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from: requestedFrom } = await searchParams;

  const [creation, canvaAccount] = await Promise.all([
    prisma.creation.findUnique({
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
    }),
    // Only ReviewActionBar's "Edit in Canva"/"Connect Canva" button label
    // needs this (Phase 2, see CANVA_NEXT_PHASE_PLAN.md §9/§10) — a cheap
    // single-row lookup, same query shape `getConnections()` already runs.
    prisma.connectedAccount.findFirst({ where: { platform: "CANVA" } }),
  ]);

  if (!creation) {
    notFound();
  }

  const canvaConnected = canvaAccount?.status === "CONNECTED";

  // Content/media separation (see lib/creations/plan-content-views.ts):
  // each Plan's own structured text, fetched independently of whether its
  // media ever succeeded — a failed slide/frame/scene's text must still be
  // readable here. Reuses the exact same `getXPlanById` service functions
  // Regenerate and the Canva "Edit in Canva" route already call; no new
  // data-fetching pattern.
  const [carouselPlanResult, postPlanResult, storyPlanResult, reelPlanResult] = await Promise.all([
    creation.carouselPlanId ? getCarouselPlanById(creation.carouselPlanId) : Promise.resolve(null),
    creation.postPlanId ? getPostPlanById(creation.postPlanId) : Promise.resolve(null),
    creation.storyPlanId ? getStoryPlanById(creation.storyPlanId) : Promise.resolve(null),
    creation.reelPlanId ? getReelPlanById(creation.reelPlanId) : Promise.resolve(null),
  ]);

  const carouselPlanSlides = carouselPlanResult ? carouselPlanToSlides(carouselPlanResult.data) : null;
  const storyPlanFrames = storyPlanResult ? storyPlanToFrames(storyPlanResult.data) : null;
  const reelPlanContent = reelPlanResult ? reelPlanToReel(reelPlanResult.data) : null;
  const postPlanContent = postPlanResult
    ? {
        headline: postPlanResult.data.headline,
        body: postPlanResult.data.body,
        cta: postPlanResult.data.cta,
      }
    : null;

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

  // Caption is always shown; the only other tab shown is the one matching
  // this creation's actual contentType (see PRIMARY_FORMAT_TAB above) — never
  // a fixed list of all four formats.
  const primaryFormatTab = PRIMARY_FORMAT_TAB[creation.contentType];
  const generatedContentTabs = (
    primaryFormatTab ? (["caption", primaryFormatTab] as const) : (["caption"] as const)
  );

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
            carouselPlanSlides={carouselPlanSlides}
            storyPlanFrames={storyPlanFrames}
            reelPlanContent={reelPlanContent}
            postPlanContent={postPlanContent}
            tabs={generatedContentTabs}
            mediaRefreshKey={creation.updatedAt.toISOString()}
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
          {creation.postPlanId && (
            <PostMediaPreview key={creation.updatedAt.toISOString()} postPlanId={creation.postPlanId} />
          )}
          {/* Content/media separation — the post's own headline/body/CTA
              (PostPlan.data), shown independently of whether the image
              above succeeded. Not part of GeneratedContentSections here:
              the Review page's trimmed `tabs` prop omits "Post" entirely
              (it already has this dedicated section), so this is the one
              place a POST creation's structured content is visible. */}
          {postPlanContent && <PostContentCard content={postPlanContent} />}
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
        contentType={creation.contentType}
        canvaConnected={canvaConnected}
        canvaSyncStatus={creation.canvaSyncStatus}
        canvaEditUrl={creation.canvaEditUrl}
        canvaLastSyncedAt={creation.canvaLastSyncedAt?.toISOString() ?? null}
      />
    </div>
  );
}
