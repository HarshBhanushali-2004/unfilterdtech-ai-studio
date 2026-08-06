import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { CopyButton } from "@/components/creations/copy-button";
import { CreationActions } from "@/components/creations/creation-actions";
import { CreationBreadcrumbs } from "@/components/creations/creation-breadcrumbs";
import { AIEditorPanel } from "@/components/creations/ai-editor-panel";
import { GeneratedContentSections } from "@/components/creations/generated-content-sections";
import { ResearchPanel } from "@/components/creations/research-panel";
import { PlannerPanel } from "@/components/creations/planner-panel";
import { KeywordPanel } from "@/components/creations/keyword-panel";
import { QualityScorePanel } from "@/components/creations/quality-score-panel";
import { SuggestionsPanel } from "@/components/creations/suggestions-panel";
import { VisualAssetsPanel } from "@/components/creations/visual-assets-panel";
import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { BrandKitBadge } from "@/components/brand-kit/brand-kit-badge";
import { formatDate } from "@/lib/format-date";
import {
  researchObjectSchema,
  plannerObjectSchema,
  qualityScoreSchema,
  suggestionSchema,
  visualPromptObjectSchema,
} from "@/lib/ai";
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
    <>
    <div className="space-y-8">
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
            carousel: creation.carousel as unknown as CarouselSlide[] | null,
            story: creation.story as unknown as StoryFrame[] | null,
            reel: creation.reel as unknown as ReelContent | null,
          }}
          redirectTo={redirectTo}
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-12 xl:gap-10">
        {/* Left Column */}
        <div className="space-y-8 pb-10 xl:col-span-5">
          <div className="rounded-2xl border p-5 md:p-6">
            <h2 className="mb-5 text-lg font-semibold">
              Caption
            </h2>

            <p className="whitespace-pre-wrap leading-7">
              {creation.caption}
            </p>

          </div>
          <div className="rounded-2xl border p-5 md:p-6">
            <CollapsibleSection title="Prompt Used" defaultOpen={false}>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <CopyButton
                    text={creation.prompt || ""}
                    label="Copy"
                    successMessage="Prompt copied"
                    variant="outline"
                    size="sm"
                  />
                </div>

                <div className="rounded-lg bg-muted/40 p-5">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-6">
                    {creation.prompt || "No prompt available."}
                  </pre>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {research?.success && <ResearchPanel research={research.data} />}
          {planner?.success && <PlannerPanel planner={planner.data} />}
          {planner?.success && (
            <KeywordPanel keywords={planner.data.keywordIntelligence} />
          )}
          {qualityScore?.success && (
            <QualityScorePanel scores={qualityScore.data} />
          )}
          {suggestions?.success && (
            <SuggestionsPanel suggestions={suggestions.data} />
          )}
          {visualPrompt?.success && (
            <VisualAssetsPanel
              visualPromptId={creation.visualPrompt!.id}
              visualPrompt={visualPrompt.data}
            />
          )}
        </div>

        <div className="xl:col-span-7">
          <AIEditorPanel
            creationId={creation.id}
            content={creation.caption}
          />
        </div>
      </div>
    </div>

    {/* Generated Content Preview */}
    <div className="mt-10">
      <GeneratedContentSections
        caption={creation.caption}
        hashtags={hashtags}
        carousel={
          Array.isArray(creation.carousel)
            ? (creation.carousel as unknown as CarouselSlide[])
            : null
        }
        story={
          Array.isArray(creation.story)
            ? (creation.story as unknown as StoryFrame[])
            : null
        }
        reel={creation.reel ? (creation.reel as unknown as ReelContent) : null}
      />
    </div>
    </>
  );
}
