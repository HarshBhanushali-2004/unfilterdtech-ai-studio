"use client";

import * as React from "react";
import { Clapperboard, ImageIcon, Loader2, Type } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CarouselSlideMediaDTO } from "@/lib/carousel-plan/types";
import { displayedMediaType } from "@/lib/format-media/display-media-type";
import { MediaFailedState } from "./media-failed-state";
import { MediaLightbox, type LightboxItem } from "./media-lightbox";

type CarouselSlidesGalleryProps = {
  carouselPlanId: string;
  /** Slide count from the plan itself — used for the initial skeleton before any slide media has loaded. */
  slideCount: number;
};

const MEDIA_TYPE_BADGE: Record<string, { label: string; icon: React.ReactNode }> = {
  IMAGE: { label: "Image", icon: <ImageIcon className="size-3" /> },
  VIDEO: { label: "Video", icon: <Clapperboard className="size-3" /> },
  NO_MEDIA: { label: "Text", icon: <Type className="size-3" /> },
};

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);

/** How often to re-check while any slide is still resolving/rendering. */
const POLL_INTERVAL_MS = 3000;
/** Stop polling after this long even if something never reaches a terminal status — avoids polling forever if a slide is genuinely stuck (e.g. an unhandled failure from before the maxDuration fix). The last-fetched state just stays on screen; a page reload (or Regenerate) tries again. */
const MAX_POLL_MS = 120_000;

/**
 * The Review page's carousel gallery for creations made through Phase 1's
 * AI Carousel Engine (see AGENTS.md) — an ordered, horizontally-scrollable
 * row of the actual rendered slides (template + media + Brand Kit already
 * composited server-side, see `lib/carousel-plan/generate-media-for-plan.ts`),
 * each badged IMAGE/VIDEO/TEXT so a reviewer can see at a glance which
 * slides used real/generated media versus pure typography. Read-only, same
 * as `GeneratedImagesGallery` — the only way to change a slide is the
 * bottom action bar's Regenerate (CLAUDE.md Section 12).
 *
 * Polls while generation is still in progress (Phase 1B, AGENTS.md: "loading
 * state while generating") rather than fetching once — media generation is
 * best-effort-awaited server-side before save/regenerate returns, but a
 * slow carousel (many slides, a rate-limited provider) can still be mid-flight
 * when this page first loads, or a slide's row can start out PENDING/
 * RESOLVING/RENDERING before reaching a terminal status. Without polling,
 * that shows as a permanently-spinning "stuck" tile — the exact "grey
 * placeholder" symptom Phase 1B was asked to fix.
 */
export function CarouselSlidesGallery({ carouselPlanId, slideCount }: CarouselSlidesGalleryProps) {
  const [slides, setSlides] = React.useState<CarouselSlideMediaDTO[] | null>(null);
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    async function load() {
      try {
        const response = await fetch(`/api/carousel-plans/${carouselPlanId}/slides`);
        const json = await response.json();
        if (cancelled || !Array.isArray(json.data)) return;

        const sorted = [...json.data].sort(
          (a: CarouselSlideMediaDTO, b: CarouselSlideMediaDTO) => a.slideOrder - b.slideOrder
        );
        setSlides(sorted);

        const stillGenerating =
          sorted.length < slideCount || sorted.some((slide) => !TERMINAL_STATUSES.has(slide.status));

        if (stillGenerating && Date.now() - startedAt < MAX_POLL_MS) {
          timeoutId = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setSlides((previous) => previous ?? []);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [carouselPlanId, slideCount]);

  if (slides === null) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: Math.max(slideCount, 1) }).map((_, index) => (
          <Skeleton key={index} className="aspect-[4/5] w-56 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <ImageIcon className="size-5" />
        No slides yet — click Regenerate below to create them.
      </div>
    );
  }

  // Only completed slides have anything to view fullscreen — prev/next in
  // the lightbox cycles through these, not the raw slide list, so it never
  // lands on a slide with no image (see `MediaLightbox`'s doc comment).
  const viewableSlides = slides.filter((slide) => slide.status === "COMPLETED" && slide.renderedImageUrl);
  const lightboxItems: LightboxItem[] = viewableSlides.map((slide) => ({
    id: slide.id,
    imageUrl: slide.renderedImageUrl!,
    label: `Slide ${slide.slideOrder}`,
    badgeLabel: MEDIA_TYPE_BADGE[displayedMediaType(slide.mediaType, slide.resolutionPath)]?.label ?? "Image",
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {slides.map((slide) => {
        // Show what was actually resolved, not just what the plan asked
        // for — a VIDEO decision that fell back to a generated image must
        // never be labeled "Video" (see `displayedMediaType`'s doc comment).
        const shownType = displayedMediaType(slide.mediaType, slide.resolutionPath);
        const badge = MEDIA_TYPE_BADGE[shownType] ?? MEDIA_TYPE_BADGE.NO_MEDIA;
        const isViewable = slide.status === "COMPLETED" && slide.renderedImageUrl;

        return (
          <div key={slide.id} className="w-56 shrink-0 space-y-2">
            <div className="aspect-[4/5] overflow-hidden rounded-xl border bg-muted">
              {isViewable ? (
                // Data URL stored directly in the DB (no object storage configured) — same pattern as GeneratedImage.imageUrl.
                <button
                  type="button"
                  className="block h-full w-full cursor-zoom-in"
                  onClick={() => setOpenIndex(viewableSlides.findIndex((s) => s.id === slide.id))}
                  aria-label={`Open Slide ${slide.slideOrder} preview`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.renderedImageUrl!}
                    alt={`Slide ${slide.slideOrder}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : slide.status === "FAILED" ? (
                <MediaFailedState errorCode={slide.errorCode} errorMessage={slide.errorMessage} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-0.5 text-xs text-muted-foreground">
              <span>Slide {slide.slideOrder}</span>
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
