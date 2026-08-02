import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { CopyButton } from "@/components/creations/copy-button";
import { CreationActions } from "@/components/creations/creation-actions";
import { AIEditorPanel } from "@/components/creations/ai-editor-panel";
import { GeneratedContentSections } from "@/components/creations/generated-content-sections";
import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { BrandKitBadge } from "@/components/brand-kit/brand-kit-badge";
import { formatDate } from "@/lib/format-date";
import type { CarouselSlide, StoryFrame, ReelContent } from "@/lib/ai/types";

export default async function CreationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
    },
  });

  if (!creation) {
    notFound();
  }

  const redirectTo = creation.project
    ? `/projects/${creation.project.id}`
    : "/projects";

  const hashtags = Array.isArray(creation.hashtags)
    ? (creation.hashtags as string[])
    : [];

  return (
    <div className="space-y-8">
      <Link
        href={redirectTo}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {creation.project ? creation.project.name : "Projects"}
      </Link>

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

      <div className="grid gap-8 xl:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 xl:col-span-5">
          <div className="rounded-2xl border p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Caption
            </h2>

            <p className="whitespace-pre-wrap leading-7">
              {creation.caption}
            </p>

          </div>
          <div className="rounded-2xl border p-6">
            <CollapsibleSection title="Prompt Used" defaultOpen={false}>
              <div className="space-y-3">
                <div className="flex justify-end">
                  <CopyButton
                    text={creation.prompt || ""}
                    label="Copy"
                    successMessage="Prompt copied"
                    variant="outline"
                    size="sm"
                  />
                </div>

                <div className="rounded-lg bg-muted/40 p-4">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-6">
                    {creation.prompt || "No prompt available."}
                  </pre>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>

        <div className="xl:col-span-7">
          <AIEditorPanel
            creationId={creation.id}
            content={creation.caption}
          />
        </div>
      </div>

      {/* Generated Content Preview */}
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
  );
}
