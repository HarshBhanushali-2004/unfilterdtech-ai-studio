"use client";

import * as React from "react";
import { Clapperboard, ImageIcon, Loader2, Type } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { StoryFrameMediaDTO } from "@/lib/story-plan/types";
import { displayedMediaType } from "@/lib/format-media/display-media-type";
import { MediaFailedState } from "./media-failed-state";
import { MediaLightbox, type LightboxItem } from "./media-lightbox";

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
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  // See `CarouselSlidesGallery`'s matching state (Phase 1C.6): prefer the
  // plan's own authoritative frame count over the `frameCount` prop, which
  // is sourced from `Creation.story` and can drift from the plan.
  const [planFrameCount, setPlanFrameCount] = React.useState<number | null>(null);

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
        if (typeof json.totalFrames === "number" && json.totalFrames > 0) {
          setPlanFrameCount(json.totalFrames);
        }

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

  // See `CarouselSlidesGallery`'s matching comment (Phase 1C.6): the
  // lightbox counter/navigation must reflect the StoryPlan's actual total,
  // not just the frames that finished rendering.
  const totalFrames = planFrameCount ?? frameCount;
  const lightboxItems: LightboxItem[] = Array.from({ length: totalFrames }, (_, index) => {
    const order = index + 1;
    const frame = frames.find((f) => f.frameOrder === order);
    const label = `Frame ${order}`;
    if (frame?.status === "COMPLETED" && frame.renderedImageUrl) {
      return {
        id: frame.id,
        label,
        badgeLabel: MEDIA_TYPE_BADGE[displayedMediaType(frame.mediaType, frame.resolutionPath)]?.label ?? "Image",
        available: true,
        imageUrl: frame.renderedImageUrl,
      };
    }
    return {
      id: frame?.id ?? `pending-frame-${order}`,
      label,
      badgeLabel: "Image",
      available: false,
      errorCode: frame?.errorCode,
      errorMessage: frame?.errorMessage,
    };
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {frames.map((frame) => {
        const shownType = displayedMediaType(frame.mediaType, frame.resolutionPath);
        const badge = MEDIA_TYPE_BADGE[shownType] ?? MEDIA_TYPE_BADGE.NO_MEDIA;
        const isViewable = frame.status === "COMPLETED" && frame.renderedImageUrl;

        return (
          <div key={frame.id} className="w-40 shrink-0 space-y-2">
            <div className="aspect-[9/16] overflow-hidden rounded-xl border bg-muted">
              {isViewable ? (
                <button
                  type="button"
                  className="block h-full w-full cursor-zoom-in"
                  onClick={() => setOpenIndex(frame.frameOrder - 1)}
                  aria-label={`Open Frame ${frame.frameOrder} preview`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={frame.renderedImageUrl!}
                    alt={`Frame ${frame.frameOrder}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : frame.status === "FAILED" ? (
                <MediaFailedState errorCode={frame.errorCode} errorMessage={frame.errorMessage} />
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

      <MediaLightbox items={lightboxItems} openIndex={openIndex} onOpenIndexChange={setOpenIndex} />
    </div>
  );
}
