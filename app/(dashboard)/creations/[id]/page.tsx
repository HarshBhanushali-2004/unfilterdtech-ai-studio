import Link from "next/link";
import { ArrowLeft, Copy, Pencil, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { CreationHeader } from "@/components/creations/creation-header";
import { CaptionCard } from "@/components/creations/caption-card";
import { HashtagsCard } from "@/components/creations/hashtags-card";
import { CarouselCard } from "@/components/creations/carousel-card";
import { StoryCard } from "@/components/creations/story-card";
import { ReelCard } from "@/components/creations/reel-card";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

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
        href={`/projects/${creation.projectId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      <CreationHeader
        title={creation.title}
        contentType={creation.contentType}
        model={creation.model}
        createdAt={creation.createdAt}
      />

      <div className="grid gap-6">
        <CaptionCard caption={creation.caption} />

        {creation.hashtags && (
          <HashtagsCard
            hashtags={creation.hashtags as string[]}
          />
        )}

        {creation.hashtags && (
          <div className="rounded-xl border p-6">
            <h2 className="mb-3 text-lg font-semibold">
              Hashtags
            </h2>

            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-sm">
              {JSON.stringify(creation.hashtags, null, 2)}
            </pre>
          </div>
        )}

        {creation.carousel && (
          <CarouselCard
            slides={creation.carousel as any[]}
          />
        )}

        {creation.story && (
          <StoryCard
            stories={creation.story as any[]}
          />
        )}

        {creation.reel && (
          <ReelCard
            reel={creation.reel as any}
          />
        )}
      </div>
    </div>
  );
}