"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { displayedMediaType } from "@/lib/format-media/display-media-type";
import type { CarouselSlideMediaDTO } from "@/lib/carousel-plan/types";
import { CarouselCard, type CarouselSlide } from "./carousel-card";
import { GeneratedImagesGallery } from "./generated-images-gallery";
import { MediaSequenceViewer, type SequenceItem } from "./media-sequence-viewer";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 120_000;

const MEDIA_TYPE_LABEL: Record<string, string> = { IMAGE: "Image", VIDEO: "Video", NO_MEDIA: "Text" };

function formatSlide(slide: CarouselSlide): string {
  return `Slide ${slide.slideNumber}\n\nHeadline:\n${slide.headline}\n\nBody:\n${slide.body}\n\nVisual Suggestion:\n${slide.visualSuggestion}`;
}

type CarouselWorkspaceProps = {
  creationId: string;
  carouselPlanId: string | null;
  slides: CarouselSlide[] | null;
  visualPromptId: string | null;
};

/**
 * The Carousel-specific main workspace (Core Requirement #3) — a large
 * active-slide viewer with prev/next + a "N / total" counter + a thumbnail
 * strip, and that one active slide's own headline/body/CTA/visual
 * suggestion directly underneath it. Replaces the old pattern of a
 * horizontal media strip followed by a long, disconnected stack of every
 * slide's text card — a reviewer now inspects one slide at a time instead
 * of scrolling through the whole deck to understand it.
 *
 * `carouselPlanId` is only set for a creation made through Phase 1's AI
 * Carousel Engine (see AGENTS.md) — an older creation (or a plan-less
 * regeneration) has none, and falls back to the legacy flat `slides` text
 * plus the generic slot-based `GeneratedImagesGallery`, exactly as the
 * pre-redesign Review page did.
 */
export function CarouselWorkspace({ creationId, carouselPlanId, slides, visualPromptId }: CarouselWorkspaceProps) {
  const router = useRouter();
  const [media, setMedia] = React.useState<CarouselSlideMediaDTO[] | null>(null);
  const [total, setTotal] = React.useState<number>(slides?.length ?? 0);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [regeneratingSlide, setRegeneratingSlide] = React.useState(false);

  React.useEffect(() => {
    if (!carouselPlanId) return;

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
        setMedia(sorted);
        if (typeof json.totalSlides === "number" && json.totalSlides > 0) setTotal(json.totalSlides);

        const stillGenerating =
          sorted.length < (slides?.length ?? 0) || sorted.some((slide) => !TERMINAL_STATUSES.has(slide.status));
        if (stillGenerating && Date.now() - startedAt < MAX_POLL_MS) {
          timeoutId = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setMedia((previous) => previous ?? []);
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselPlanId]);

  const copyCarousel = () => {
    if (!slides || slides.length === 0) return;
    copyToClipboard(slides.map(formatSlide).join("\n\n------------------------\n\n"), "Carousel copied");
  };

  /**
   * Regenerates exactly one slide's media — never the plan text, never any
   * other slide (Core Requirement #16). `router.refresh()` re-pulls the
   * Server Component's `creation.updatedAt`, which this component is keyed
   * on at the page level, so a fresh `updatedAt` remounts this whole
   * workspace and re-fetches every slide's current state — the same
   * established "mutate → refresh → remount" pattern the whole-creation
   * Regenerate/Canva actions already use, not a new one.
   */
  async function regenerateSlide(slideOrder: number) {
    if (regeneratingSlide) return;
    setRegeneratingSlide(true);

    try {
      const res = await fetch(`/api/creations/${creationId}/carousel/slides/${slideOrder}/regenerate`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success(`Slide ${slideOrder} regenerated`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to regenerate this slide right now.");
    } finally {
      setRegeneratingSlide(false);
    }
  }

  if (!carouselPlanId) {
    // Legacy path — no per-slide media table to drive an interactive
    // viewer with. Preserve the exact previous behavior rather than
    // inventing an interaction the data can't actually back.
    return (
      <div className="space-y-6">
        <GeneratedImagesGallery visualPromptId={visualPromptId} />
        {slides && slides.length > 0 && <CarouselCard slides={slides} />}
      </div>
    );
  }

  const items: SequenceItem[] | null =
    media === null
      ? null
      : media.map((slide) => ({
          id: slide.id,
          order: slide.slideOrder,
          status: slide.status,
          renderedImageUrl: slide.renderedImageUrl,
          errorCode: slide.errorCode,
          errorMessage: slide.errorMessage,
          badgeLabel: MEDIA_TYPE_LABEL[displayedMediaType(slide.mediaType, slide.resolutionPath)] ?? "Image",
        }));

  const activeSlide = slides?.find((slide) => slide.slideNumber === activeIndex + 1) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={copyCarousel}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Carousel
        </Button>
      </div>

      <MediaSequenceViewer
        items={items}
        total={total || slides?.length || 0}
        noun="Slide"
        aspectClassName="aspect-[4/5]"
        maxWidthClassName="max-w-lg"
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />

      {activeSlide && (
        <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Headline</h3>
              <p className="text-lg font-semibold">{activeSlide.headline}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={regeneratingSlide}
              onClick={() => regenerateSlide(activeIndex + 1)}
            >
              <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${regeneratingSlide ? "animate-spin" : ""}`} />
              {regeneratingSlide ? "Regenerating…" : "Regenerate this slide"}
            </Button>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Body</h3>
            <p className="whitespace-pre-wrap break-words">{activeSlide.body}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Visual Suggestion</h3>
            <p className="italic text-muted-foreground">{activeSlide.visualSuggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}
