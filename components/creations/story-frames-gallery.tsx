"use client";

import * as React from "react";
import { AlertTriangle, Clapperboard, ImageIcon, Loader2, Type } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { StoryFrameMediaDTO } from "@/lib/story-plan/types";
import { displayedMediaType } from "@/lib/format-media/display-media-type";

type StoryFramesGalleryProps = {
  storyPlanId: string;
  frameCount: number;
};

const MEDIA_TYPE_BADGE: Record<string, { label: string; icon: React.ReactNode }> = {
  IMAGE: { label: "Image", icon: <ImageIcon className="size-3" /> },
  VIDEO: { label: "Video", icon: <Clapperboard className="size-3" /> },
  NO_MEDIA: { label: "Text", icon: <Type className="size-3" /> },
};

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 120_000;

/**
 * The Review page's story gallery for creations made through Phase 1C's
 * Story Planner (see AGENTS.md) — an ordered, horizontally-scrollable row
 * of the actual rendered 9:16 frames, each badged IMAGE/VIDEO/TEXT.
 * Mirrors `CarouselSlidesGallery` exactly, including the same
 * poll-while-generating behavior — see that component's doc comment for why.
 */
export function StoryFramesGallery({ storyPlanId, frameCount }: StoryFramesGalleryProps) {
  const [frames, setFrames] = React.useState<StoryFrameMediaDTO[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    async function load() {
      try {
        const response = await fetch(`/api/story-plans/${storyPlanId}/frames`);
        const json = await response.json();
        if (cancelled || !Array.isArray(json.data)) return;

        const sorted = [...json.data].sort(
          (a: StoryFrameMediaDTO, b: StoryFrameMediaDTO) => a.frameOrder - b.frameOrder
        );
        setFrames(sorted);

        const stillGenerating =
          sorted.length < frameCount || sorted.some((frame) => !TERMINAL_STATUSES.has(frame.status));

        if (stillGenerating && Date.now() - startedAt < MAX_POLL_MS) {
          timeoutId = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setFrames((previous) => previous ?? []);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [storyPlanId, frameCount]);

  if (frames === null) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: Math.max(frameCount, 1) }).map((_, index) => (
          <Skeleton key={index} className="aspect-[9/16] w-40 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (frames.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <ImageIcon className="size-5" />
        No frames yet — click Regenerate below to create them.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {frames.map((frame) => {
        const shownType = displayedMediaType(frame.mediaType, frame.resolutionPath);
        const badge = MEDIA_TYPE_BADGE[shownType] ?? MEDIA_TYPE_BADGE.NO_MEDIA;

        return (
          <div key={frame.id} className="w-40 shrink-0 space-y-2">
            <div className="aspect-[9/16] overflow-hidden rounded-xl border bg-muted">
              {frame.status === "COMPLETED" && frame.renderedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={frame.renderedImageUrl}
                  alt={`Frame ${frame.frameOrder}`}
                  className="h-full w-full object-cover"
                />
              ) : frame.status === "FAILED" ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 p-3 text-center text-xs text-destructive">
                  <AlertTriangle className="size-4" />
                  {frame.errorMessage || "This frame couldn't be generated."}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-0.5 text-xs text-muted-foreground">
              <span>Frame {frame.frameOrder}</span>
              <Badge variant="outline" className="gap-1 font-normal">
                {badge.icon}
                {badge.label}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
