"use client";

import * as React from "react";
import { Info, Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { ReelSceneMediaDTO } from "@/lib/reel-plan/types";
import { MediaFailedState } from "./media-failed-state";
import { MediaLightbox, type LightboxItem } from "./media-lightbox";

type ReelScenesGalleryProps = {
  reelPlanId: string;
  sceneCount: number;
};

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 120_000;

/**
 * The Review page's reel storyboard for creations made through Phase 1C's
 * Reel Planner (see AGENTS.md) — an ordered row of static scene preview
 * images. **Deliberately not a video player**: Phase 1C has no video
 * composition (no FFmpeg, no video-generation provider — see `ReelPlan`'s
 * Prisma doc comment), so pretending a playable Reel exists here would be
 * exactly the "do not fake features" AGENTS.md explicitly warns against.
 * The banner below states that plainly rather than hiding the gap.
 */
export function ReelScenesGallery({ reelPlanId, sceneCount }: ReelScenesGalleryProps) {
  const [scenes, setScenes] = React.useState<ReelSceneMediaDTO[] | null>(null);
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    async function load() {
      try {
        const response = await fetch(`/api/reel-plans/${reelPlanId}/scenes`);
        const json = await response.json();
        if (cancelled || !Array.isArray(json.data)) return;

        const sorted = [...json.data].sort(
          (a: ReelSceneMediaDTO, b: ReelSceneMediaDTO) => a.sceneOrder - b.sceneOrder
        );
        setScenes(sorted);

        const stillGenerating =
          sorted.length < sceneCount || sorted.some((scene) => !TERMINAL_STATUSES.has(scene.status));

        if (stillGenerating && Date.now() - startedAt < MAX_POLL_MS) {
          timeoutId = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setScenes((previous) => previous ?? []);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [reelPlanId, sceneCount]);

  const banner = (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <div className="space-y-1">
        <p>
          These are static scene previews, not a final video — Reel video composition (stitching clips,
          transitions, audio) isn&apos;t built yet. Each image shows what that scene&apos;s visual direction
          looks like.
        </p>
        <p>
          <span className="font-medium">Audio:</span> no licensed/royalty-free audio provider is connected yet
          (architecture ready — see the Audio Resolver) — reels generate without a soundtrack.
        </p>
      </div>
    </div>
  );

  if (scenes === null) {
    return (
      <div className="space-y-4">
        {banner}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: Math.max(sceneCount, 1) }).map((_, index) => (
            <Skeleton key={index} className="aspect-[9/16] w-40 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="space-y-4">
        {banner}
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No scene previews yet — click Regenerate below to create them.
        </div>
      </div>
    );
  }

  const viewableScenes = scenes.filter((scene) => scene.status === "COMPLETED" && scene.renderedImageUrl);
  const lightboxItems: LightboxItem[] = viewableScenes.map((scene) => ({
    id: scene.id,
    imageUrl: scene.renderedImageUrl!,
    label: `Scene ${scene.sceneOrder}`,
    badgeLabel: "Storyboard preview",
  }));

  return (
    <div className="space-y-4">
      {banner}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {scenes.map((scene) => {
          const isViewable = scene.status === "COMPLETED" && scene.renderedImageUrl;
          return (
            <div key={scene.id} className="w-40 shrink-0 space-y-2">
              <div className="aspect-[9/16] overflow-hidden rounded-xl border bg-muted">
                {isViewable ? (
                  <button
                    type="button"
                    className="block h-full w-full cursor-zoom-in"
                    onClick={() => setOpenIndex(viewableScenes.findIndex((s) => s.id === scene.id))}
                    aria-label={`Open Scene ${scene.sceneOrder} preview`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={scene.renderedImageUrl!}
                      alt={`Scene ${scene.sceneOrder}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : scene.status === "FAILED" ? (
                  <MediaFailedState errorCode={scene.errorCode} errorMessage={scene.errorMessage} />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              <p className="px-0.5 text-xs text-muted-foreground">Scene {scene.sceneOrder}</p>
            </div>
          );
        })}

        <MediaLightbox items={lightboxItems} openIndex={openIndex} onOpenIndexChange={setOpenIndex} />
      </div>
    </div>
  );
}
