"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MediaFailedState } from "./media-failed-state";
import { MediaLightbox, type LightboxItem } from "./media-lightbox";

export type SequenceItem = {
  id: string;
  /** 1-based position in the plan's own order (slideOrder/frameOrder/sceneOrder). */
  order: number;
  status: string;
  renderedImageUrl: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  badgeLabel: string;
};

type MediaSequenceViewerProps = {
  /** `null` while the first fetch is in flight, `[]` once loaded with nothing rendered yet. */
  items: SequenceItem[] | null;
  /** The plan's own authoritative count — may exceed `items.length` while generation is still catching up. */
  total: number;
  /** "Slide" | "Frame" | "Scene" — used for the counter pill and empty state copy. */
  noun: string;
  aspectClassName: string;
  maxWidthClassName?: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
};

/**
 * The large, single-item-at-a-time viewer behind the Carousel/Story/Reel
 * workspaces (Core Requirement #3: "large active slide preview, previous/
 * next controls, slide number, thumbnail strip" — the same interaction
 * model applies almost verbatim to Story frames and Reel scene storyboards,
 * so this one component serves all three rather than three near-duplicate
 * viewers). A failed/still-generating item never disappears from the
 * sequence — it keeps its position and shows `MediaFailedState` or a
 * spinner in place of the image (Core Requirement #9).
 */
export function MediaSequenceViewer({
  items,
  total,
  noun,
  aspectClassName,
  maxWidthClassName = "max-w-md",
  activeIndex,
  onActiveIndexChange,
}: MediaSequenceViewerProps) {
  const [zoomOpen, setZoomOpen] = React.useState(false);

  if (items === null) {
    return (
      <div className={cn("mx-auto w-full space-y-3", maxWidthClassName)}>
        <Skeleton className={cn("w-full rounded-2xl", aspectClassName)} />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: Math.max(total, 3) }).map((_, index) => (
            <Skeleton key={index} className={cn("h-16 w-12 shrink-0 rounded-lg", aspectClassName)} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "mx-auto flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground",
          maxWidthClassName,
          aspectClassName
        )}
      >
        No {noun.toLowerCase()}s yet — click Regenerate below to create them.
      </div>
    );
  }

  // Synthesize the full 1..total sequence so a slot with no media row yet
  // (still generating) still occupies its real position — never skip or
  // renumber around a missing/failed item.
  const sequence: (SequenceItem | null)[] = Array.from({ length: Math.max(total, items.length) }, (_, index) => {
    const order = index + 1;
    return items.find((item) => item.order === order) ?? null;
  });

  const clampedIndex = Math.min(activeIndex, sequence.length - 1);
  const active = sequence[clampedIndex];
  const isViewable = active?.status === "COMPLETED" && active.renderedImageUrl;
  const hasMultiple = sequence.length > 1;

  const lightboxItems: LightboxItem[] = sequence.map((item, index) => {
    const label = `${noun} ${index + 1}`;
    if (item?.status === "COMPLETED" && item.renderedImageUrl) {
      return { id: item.id, label, badgeLabel: item.badgeLabel, available: true, imageUrl: item.renderedImageUrl };
    }
    return {
      id: item?.id ?? `pending-${index}`,
      label,
      badgeLabel: item?.badgeLabel ?? "Image",
      available: false,
      errorCode: item?.errorCode,
      errorMessage: item?.errorMessage,
    };
  });

  function goTo(index: number) {
    if (index < 0 || index >= sequence.length) return;
    onActiveIndexChange(index);
  }

  return (
    <div className={cn("mx-auto w-full space-y-3", maxWidthClassName)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-muted shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          aspectClassName
        )}
        tabIndex={hasMultiple ? 0 : undefined}
        role={hasMultiple ? "group" : undefined}
        aria-roledescription={hasMultiple ? "carousel" : undefined}
        aria-label={hasMultiple ? `${noun} ${clampedIndex + 1} of ${sequence.length}` : undefined}
        onKeyDown={
          hasMultiple
            ? (event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  goTo(clampedIndex - 1);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  goTo(clampedIndex + 1);
                }
              }
            : undefined
        }
      >
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
          <Badge variant="outline" className="border-transparent bg-background/80 font-medium backdrop-blur-sm">
            {noun} {clampedIndex + 1} / {sequence.length}
          </Badge>
          {active && (
            <Badge variant="outline" className="border-transparent bg-background/80 font-normal backdrop-blur-sm">
              {active.badgeLabel}
            </Badge>
          )}
        </div>

        {isViewable ? (
          <button
            type="button"
            className="block h-full w-full cursor-zoom-in"
            onClick={() => setZoomOpen(true)}
            aria-label={`Open ${noun.toLowerCase()} ${clampedIndex + 1} preview`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.renderedImageUrl!}
              alt={`${noun} ${clampedIndex + 1}`}
              className="h-full w-full object-cover"
            />
          </button>
        ) : active?.status === "FAILED" ? (
          <MediaFailedState errorCode={active.errorCode} errorMessage={active.errorMessage} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasMultiple && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-background/70 backdrop-blur-sm hover:bg-background"
              disabled={clampedIndex === 0}
              onClick={() => goTo(clampedIndex - 1)}
              aria-label={`Previous ${noun.toLowerCase()}`}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-background/70 backdrop-blur-sm hover:bg-background"
              disabled={clampedIndex === sequence.length - 1}
              onClick={() => goTo(clampedIndex + 1)}
              aria-label={`Next ${noun.toLowerCase()}`}
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sequence.map((item, index) => {
            const thumbViewable = item?.status === "COMPLETED" && item.renderedImageUrl;
            const isActive = index === clampedIndex;

            return (
              <button
                key={item?.id ?? `slot-${index}`}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Go to ${noun.toLowerCase()} ${index + 1}`}
                aria-current={isActive}
                className={cn(
                  "relative w-12 shrink-0 overflow-hidden rounded-lg border bg-muted transition-all",
                  aspectClassName,
                  isActive ? "ring-2 ring-violet-500 ring-offset-1 ring-offset-background" : "opacity-70 hover:opacity-100"
                )}
              >
                {thumbViewable ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.renderedImageUrl!} alt="" className="h-full w-full object-cover" />
                ) : item?.status === "FAILED" ? (
                  <div className="flex h-full w-full items-center justify-center bg-destructive/10 text-[9px] font-medium text-destructive">
                    !
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <MediaLightbox
        items={lightboxItems}
        openIndex={zoomOpen ? clampedIndex : null}
        onOpenIndexChange={(index) => {
          if (index === null) {
            setZoomOpen(false);
            return;
          }
          setZoomOpen(true);
          onActiveIndexChange(index);
        }}
      />
    </div>
  );
}
