"use client";

import * as React from "react";
import { Clapperboard, ImageIcon, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { displayedMediaType } from "@/lib/format-media/display-media-type";
import type { PostMediaDTO } from "@/lib/post-plan/types";
import { GeneratedImagesGallery } from "./generated-images-gallery";
import { MediaFailedState } from "./media-failed-state";
import { MediaLightbox, type LightboxItem } from "./media-lightbox";
import { PostContentCard, type PostPlanContent } from "./post-content-card";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 120_000;

const MEDIA_TYPE_BADGE: Record<string, { label: string; icon: React.ReactNode }> = {
  IMAGE: { label: "Image", icon: <ImageIcon className="size-3" /> },
  VIDEO: { label: "Video", icon: <Clapperboard className="size-3" /> },
};

type PostWorkspaceProps = {
  postPlanId: string | null;
  content: PostPlanContent | null;
  visualPromptId: string | null;
};

/**
 * The Post-specific main workspace (Core Requirement #4) — the generated
 * visual as the hero element, with the post's own headline/body/CTA beside
 * it on desktop (stacked below on narrow screens). Caption + hashtags are
 * deliberately not repeated here — they get their own shared section
 * (`CaptionHashtagsPanel`) below every format's workspace, so a Post's
 * caption is never shown twice.
 */
export function PostWorkspace({ postPlanId, content, visualPromptId }: PostWorkspaceProps) {
  const [media, setMedia] = React.useState<PostMediaDTO | null | undefined>(postPlanId ? undefined : null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!postPlanId) return;

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

  if (!postPlanId) {
    return (
      <div className="space-y-6">
        <GeneratedImagesGallery visualPromptId={visualPromptId} />
      </div>
    );
  }

  const badge = media ? MEDIA_TYPE_BADGE[displayedMediaType(media.mediaType, media.resolutionPath)] : undefined;
  const isViewable = media?.status === "COMPLETED" && media.renderedImageUrl;
  const lightboxItems: LightboxItem[] = isViewable
    ? [{ id: media.id, imageUrl: media.renderedImageUrl!, label: "", badgeLabel: badge?.label ?? "Image", available: true }]
    : [];

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start">
      <div className="mx-auto w-full max-w-md space-y-2 md:mx-0">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border bg-muted shadow-sm">
          {media === undefined ? (
            <Skeleton className="h-full w-full rounded-none" />
          ) : isViewable ? (
            <button
              type="button"
              className="block h-full w-full cursor-zoom-in"
              onClick={() => setOpen(true)}
              aria-label="Open post preview"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={media.renderedImageUrl!} alt="Generated post" className="h-full w-full object-cover" />
            </button>
          ) : media?.status === "FAILED" ? (
            <MediaFailedState errorCode={media.errorCode} errorMessage={media.errorMessage} />
          ) : media === null ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <ImageIcon className="size-5" />
              No post image yet — click Regenerate below to create it.
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {badge && (
          <Badge variant="outline" className="gap-1 font-normal">
            {badge.icon}
            {badge.label}
          </Badge>
        )}
      </div>

      {content && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <PostContentCard content={content} />
        </div>
      )}

      <MediaLightbox items={lightboxItems} openIndex={open ? 0 : null} onOpenIndexChange={(index) => setOpen(index !== null)} />
    </div>
  );
}
