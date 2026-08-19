import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { CaptionHashtagsPanel } from "@/components/creations/caption-hashtags-panel";
import { CarouselWorkspace } from "@/components/creations/carousel-workspace";
import { CreationActions } from "@/components/creations/creation-actions";
import { CreationBreadcrumbs } from "@/components/creations/creation-breadcrumbs";
import { DeveloperDetails } from "@/components/creations/developer-details";
import { FormatBadge } from "@/components/creations/format-badge";
import { PostWorkspace } from "@/components/creations/post-workspace";
import { ReelWorkspace } from "@/components/creations/reel-workspace";
import { ReviewActionBar } from "@/components/creations/review-action-bar";
import { StoryWorkspace } from "@/components/creations/story-workspace";
import { TruncatedTitle } from "@/components/creations/truncated-title";
import { WorkflowStatus } from "@/components/creations/workflow-status";
import { formatRelativeTime } from "@/lib/format-date";
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

  // Prefer the Plan's own text when it exists (CLAUDE.md Section 12c) —
  // falling back to the legacy flat field only for a pre-Plan creation.
  const carouselTextSlides = carouselPlanSlides && carouselPlanSlides.length > 0 ? carouselPlanSlides : carousel;
  const storyTextFrames = storyPlanFrames && storyPlanFrames.length > 0 ? storyPlanFrames : story;
  const reelContent = reelPlanContent ?? reel;

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

  // Bumped by every mutation that can change this creation's persisted
  // media (Regenerate, Canva create/sync/reset — all via Prisma's own
  // `@updatedAt`) — used as the `key` on the format workspace below so it
  // remounts and refetches fresh media after `router.refresh()` instead of
  // silently going stale (the same "gallery keeps showing old media after a
  // successful mutation" bug the previous review-page pass fixed).
  const mediaRefreshKey = creation.updatedAt.toISOString();

  return (
    <div className="space-y-10 pb-4">
      <CreationBreadcrumbs
        origin={origin}
        project={creation.project ? { id: creation.project.id, name: creation.project.name } : null}
        creationTitle={creation.title}
      />

      {/* A. Header — format, project, status, last updated, primary utilities. */}
      <div className="space-y-4">
        {/* Exactly one pill (the format) — everything else is plain, quiet
            metadata text, not a second/third/fourth badge (Core Requirement:
            "avoid excessive pills everywhere"). */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <FormatBadge contentType={creation.contentType} />
          {creation.project && <span>{creation.project.name}</span>}
          {creation.project?.brandKit && (
            <>
              <span aria-hidden className="text-muted-foreground/40">·</span>
              <span>{creation.project.brandKit.name}</span>
            </>
          )}
          <span aria-hidden className="text-muted-foreground/40">·</span>
          <span>Updated {formatRelativeTime(creation.updatedAt)}</span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <TruncatedTitle title={creation.title} />
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

        <WorkflowStatus status={creation.status} canvaSyncStatus={creation.canvaSyncStatus} />
      </div>

      {/* B. Main creation workspace — one format-specific layout, never all four. */}
      <section>
        {creation.contentType === "POST" && (
          <PostWorkspace
            key={mediaRefreshKey}
            postPlanId={creation.postPlanId}
            content={postPlanContent}
            visualPromptId={creation.visualPromptId}
          />
        )}
        {creation.contentType === "CAROUSEL" && (
          <CarouselWorkspace
            key={mediaRefreshKey}
            creationId={creation.id}
            carouselPlanId={creation.carouselPlanId}
            slides={carouselTextSlides}
            visualPromptId={creation.visualPromptId}
          />
        )}
        {creation.contentType === "STORY" && (
          <StoryWorkspace
            key={mediaRefreshKey}
            storyPlanId={creation.storyPlanId}
            frames={storyTextFrames}
            visualPromptId={creation.visualPromptId}
          />
        )}
        {creation.contentType === "REEL" && (
          <ReelWorkspace
            key={mediaRefreshKey}
            reelPlanId={creation.reelPlanId}
            reel={reelContent}
            visualPromptId={creation.visualPromptId}
          />
        )}
      </section>

      {/* C. Content details — caption + hashtags, the same for every format,
          deliberately separate from the format-specific slide/frame/scene
          content above (Core Requirement #3). */}
      <CaptionHashtagsPanel caption={creation.caption} hashtags={hashtags} />

      <DeveloperDetails
        prompt={creation.prompt}
        research={research?.success ? research.data : null}
        planner={planner?.success ? planner.data : null}
        qualityScore={qualityScore?.success ? qualityScore.data : null}
        suggestions={suggestions?.success ? suggestions.data : null}
        visualPromptId={creation.visualPromptId}
        visualPrompt={visualPrompt?.success ? visualPrompt.data : null}
      />

      {/* D. Actions — sticky, primary-action hierarchy handled inside. */}
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
