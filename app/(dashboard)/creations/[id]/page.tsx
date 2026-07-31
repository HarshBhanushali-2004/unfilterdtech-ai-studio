import Link from "next/link";
import { ArrowLeft, Copy, Pencil } from "lucide-react";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { AIEditorPanel } from "@/components/creations/ai-editor-panel";
import { HashtagsCard } from "@/components/creations/hashtags-card";
import { CarouselCard } from "@/components/creations/carousel-card";
import { StoryCard } from "@/components/creations/story-card";
import { ReelCard } from "@/components/creations/reel-card";
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
      project: true,
    },
  });

  if (!creation) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <Link
        href={creation.project ? `/projects/${creation.project.id}` : "/projects"}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {creation.project ? creation.project.name : "Projects"}
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            {creation.title}
          </h1>

          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{creation.contentType}</span>

            <span>•</span>

            <span>
              {creation.createdAt.toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button>
            <Copy className="mr-2 h-4 w-4" />
            Copy Caption
          </Button>
        </div>
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Prompt Used
              </h2>

              <Button variant="outline" size="sm">
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>

            <div className="rounded-lg bg-muted/40 p-4">
              <pre className="whitespace-pre-wrap break-words text-sm leading-6">
                {creation.prompt || "No prompt available."}
              </pre>
            </div>
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
      <div className="grid gap-6">
        {Array.isArray(creation.hashtags) && creation.hashtags.length > 0 && (
          <HashtagsCard hashtags={creation.hashtags as string[]} />
        )}

        {Array.isArray(creation.carousel) && creation.carousel.length > 0 && (
          <CarouselCard slides={creation.carousel as unknown as CarouselSlide[]} />
        )}

        {Array.isArray(creation.story) && creation.story.length > 0 && (
          <StoryCard stories={creation.story as unknown as StoryFrame[]} />
        )}

        {creation.reel && (
          <ReelCard reel={creation.reel as unknown as ReelContent} />
        )}
      </div>
    </div>
  );
}