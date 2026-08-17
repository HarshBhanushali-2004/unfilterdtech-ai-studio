"use client";

import * as React from "react";
import { Clapperboard, ImageIcon, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostMediaDTO } from "@/lib/post-plan/types";
import { displayedMediaType } from "@/lib/format-media/display-media-type";
import { MediaFailedState } from "./media-failed-state";
import { MediaLightbox, type LightboxItem } from "./media-lightbox";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 120_000;

const MEDIA_TYPE_BADGE: Record<string, { label: string; icon: React.ReactNode }> = {
  IMAGE: { label: "Image", icon: <ImageIcon className="size-3" /> },
  VIDEO: { label: "Video", icon: <Clapperboard className="size-3" /> },
};

/**
 * The Review page's rendered post preview for creations made through Phase
 * 1C's Post Planner (see AGENTS.md) — the visual counterpart to
 * `CarouselSlidesGallery`, for exactly one item. Same polling-while-
 * generating behavior for the same reason (see that component's doc
 * comment).
 */
export function PostMediaPreview({ postPlanId }: { postPlanId: string }) {
  const [media, setMedia] = React.useState<PostMediaDTO | null | undefined>(undefined);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    async function load() {
      try {
        const response = await fetch(`/api/post-plans/${postPlanId}/media`);
        const json = await response.json();
        if (cancelled) return;

        setMedia(json.data ?? null);

        const stillGenerating = !json.data || !TERMINAL_STATUSES.has(json.data.status);
        if (stillGenerating && Date.now() - startedAt < MAX_POLL_MS) {
          timeoutId = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setMedia((previous) => previous ?? null);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [postPlanId]);

  if (media === undefined) {
    return <Skeleton className="aspect-[4/5] w-full max-w-sm rounded-xl" />;
  }

  if (!media) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <ImageIcon className="size-5" />
        No post image yet — click Regenerate below to create it.
      </div>
    );
  }

  const badge = MEDIA_TYPE_BADGE[displayedMediaType(media.mediaType, media.resolutionPath)];
  const isViewable = media.status === "COMPLETED" && media.renderedImageUrl;
  const lightboxItems: LightboxItem[] = isViewable
    ? [{ id: media.id, imageUrl: media.renderedImageUrl!, label: "", badgeLabel: badge?.label ?? "Image" }]
    : [];

  return (
    <div className="max-w-sm space-y-2">
      <div className="aspect-[4/5] overflow-hidden rounded-xl border bg-muted">
        {isViewable ? (
          <button
            type="button"
            className="block h-full w-full cursor-zoom-in"
            onClick={() => setOpen(true)}
            aria-label="Open post preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.renderedImageUrl!} alt="Generated post" className="h-full w-full object-cover" />
          </button>
        ) : media.status === "FAILED" ? (
          <MediaFailedState errorCode={media.errorCode} errorMessage={media.errorMessage} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {badge && (
        <Badge variant="outline" className="gap-1 font-normal">
          {badge.icon}
          {badge.label}
        </Badge>
      )}

      <MediaLightbox
        items={lightboxItems}
        openIndex={open ? 0 : null}
        onOpenIndexChange={(index) => setOpen(index !== null)}
      />
    </div>
  );
}
