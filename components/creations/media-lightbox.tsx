"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type LightboxItem = {
  id: string;
  imageUrl: string;
  /** e.g. "Slide 3", "Frame 2", "Scene 5" — omitted (empty) for Post, which has only one item. */
  label: string;
  /** e.g. "Image", "Video", "Text", "Storyboard preview". */
  badgeLabel: string;
};

type MediaLightboxProps = {
  items: LightboxItem[];
  /** Index into `items` to open on, or `null` when closed. */
  openIndex: number | null;
  onOpenIndexChange: (index: number | null) => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const SCALE_STEP = 0.5;

/**
 * A large, fit-to-screen media viewer reused across every format's review
 * gallery (Carousel/Post/Story/Reel) — Phase 1C.6's "click a thumbnail, get
 * a real inspection view" requirement. Built on the existing `Dialog`
 * primitive rather than a bespoke overlay: Radix already gives ESC-to-close,
 * backdrop-click-to-close, and focus management for free (see
 * `components/ui/dialog.tsx`'s own doc comment on the focus-restore patch),
 * so this only adds what Dialog doesn't: zoom, and prev/next navigation
 * between the gallery's other items.
 *
 * Deliberately just an `<img>` — for a Reel's storyboard scene this stays a
 * static frame preview, never a video player (see `ReelScenesGallery`'s
 * honesty banner); this component has no video-specific affordance to
 * accidentally imply otherwise.
 */
export function MediaLightbox({ items, openIndex, onOpenIndexChange }: MediaLightboxProps) {
  const [scale, setScale] = React.useState(1);
  // Reset zoom whenever the viewed item changes — adjusted during render
  // (React's own recommended pattern for "reset state when a prop changes")
  // rather than a `useEffect`, which would commit the stale-scale frame
  // first and only correct it a tick later.
  const [scaleResetKey, setScaleResetKey] = React.useState(openIndex);
  if (openIndex !== scaleResetKey) {
    setScaleResetKey(openIndex);
    setScale(1);
  }

  const open = openIndex !== null;
  const current = openIndex !== null ? items[openIndex] : undefined;

  const goTo = React.useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= items.length) return;
      onOpenIndexChange(nextIndex);
    },
    [items.length, onOpenIndexChange]
  );

  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") goTo((openIndex ?? 0) - 1);
      if (event.key === "ArrowRight") goTo((openIndex ?? 0) + 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, openIndex, goTo]);

  if (!current) return null;

  const hasMultiple = items.length > 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenIndexChange(null)}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-[95vw] flex-col gap-3 sm:max-w-4xl" showCloseButton>
        <DialogTitle className="sr-only">
          {current.label ? `${current.label} preview` : "Media preview"}
        </DialogTitle>

        <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
          <div className="flex items-center gap-2 text-sm font-medium">
            {current.label && <span>{current.label}</span>}
            {hasMultiple && (
              <span className="text-muted-foreground font-normal">
                {(openIndex ?? 0) + 1} / {items.length}
              </span>
            )}
            <Badge variant="outline" className="font-normal">
              {current.badgeLabel}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={scale <= MIN_SCALE}
              onClick={() => setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))}
              aria-label="Zoom out"
            >
              <ZoomOut />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={scale >= MAX_SCALE}
              onClick={() => setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))}
              aria-label="Zoom in"
            >
              <ZoomIn />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={scale === 1}
              onClick={() => setScale(1)}
              aria-label="Reset zoom to fit"
            >
              <Maximize2 />
            </Button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-lg bg-black/5 dark:bg-white/5">
          {hasMultiple && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-background/70 backdrop-blur-sm hover:bg-background"
              disabled={(openIndex ?? 0) === 0}
              onClick={() => goTo((openIndex ?? 0) - 1)}
              aria-label="Previous"
            >
              <ChevronLeft />
            </Button>
          )}

          {/* `max-h-full` (percentage) doesn't reliably resolve for a
              replaced element sized by flexbox + `overflow-auto` — the
              image's own intrinsic size (e.g. 1080×1350) won a sizing fight
              against its flex container and got clipped at the bottom edge
              instead of shrinking to fit (confirmed against a real saved
              carousel slide during Phase 1C.6 browser verification). A
              viewport-relative cap sidesteps that ambiguity entirely. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.imageUrl}
            alt={current.label || "Media preview"}
            className={cn("max-h-[70vh] max-w-full object-contain transition-transform duration-150")}
            style={{ transform: `scale(${scale})` }}
          />

          {hasMultiple && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-background/70 backdrop-blur-sm hover:bg-background"
              disabled={(openIndex ?? 0) === items.length - 1}
              onClick={() => goTo((openIndex ?? 0) + 1)}
              aria-label="Next"
            >
              <ChevronRight />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
