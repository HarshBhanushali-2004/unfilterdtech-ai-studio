"use client";

import * as React from "react";
import { Copy, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import type { ReelSceneMediaDTO } from "@/lib/reel-plan/types";
import { ReelCard, type Reel } from "./reel-card";
import { GeneratedImagesGallery } from "./generated-images-gallery";
import { MediaSequenceViewer, type SequenceItem } from "./media-sequence-viewer";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 120_000;

function formatReel(reel: Reel): string {
  const scenesText = reel.scenes
    .map((scene) => `Scene ${scene.sceneNumber}\n\nNarration:\n${scene.narration}\n\nVisual:\n${scene.visual}`)
    .join("\n\n------------------------\n\n");
  return `Hook\n\n${reel.hook}\n\nScript\n\n${reel.script}\n\n------------------------\n\n${scenesText}`;
}

type ReelWorkspaceProps = {
  reelPlanId: string | null;
  reel: Reel | null;
  visualPromptId: string | null;
};

/**
 * The Reel-specific main workspace (Core Requirement #6) — video-first in
 * intent: the hero area is the vertical scene storyboard (the closest thing
 * to a video preview this pipeline actually produces — see the honesty
 * banner below), with the hook, active scene's narration, and the full
 * script laid out around it. Never implies a playable video exists where
 * one doesn't (AGENTS.md, `ReelScenesGallery`'s own doc comment) — the same
 * honesty banner that component showed is preserved here verbatim.
 */
export function ReelWorkspace({ reelPlanId, reel, visualPromptId }: ReelWorkspaceProps) {
  const [media, setMedia] = React.useState<ReelSceneMediaDTO[] | null>(null);
  const [total, setTotal] = React.useState<number>(reel?.scenes.length ?? 0);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (!reelPlanId) return;

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
        setMedia(sorted);
        if (typeof json.totalScenes === "number" && json.totalScenes > 0) setTotal(json.totalScenes);

        const stillGenerating =
          sorted.length < (reel?.scenes.length ?? 0) || sorted.some((scene) => !TERMINAL_STATUSES.has(scene.status));
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
  }, [reelPlanId]);

  const copyReel = () => {
    if (!reel) return;
    copyToClipboard(formatReel(reel), "Reel copied");
  };

  const banner = (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <p>
        These are static scene previews, not a final video — video composition (stitching clips, transitions,
        audio) isn&apos;t built yet. Each image shows that scene&apos;s visual direction.
      </p>
    </div>
  );

  if (!reelPlanId) {
    return (
      <div className="space-y-6">
        {banner}
        <GeneratedImagesGallery visualPromptId={visualPromptId} />
        {reel && <ReelCard reel={reel} />}
      </div>
    );
  }

  const items: SequenceItem[] | null =
    media === null
      ? null
      : media.map((scene) => ({
          id: scene.id,
          order: scene.sceneOrder,
          status: scene.status,
          renderedImageUrl: scene.renderedImageUrl,
          errorCode: scene.errorCode,
          errorMessage: scene.errorMessage,
          badgeLabel: "Storyboard",
        }));

  const activeScene = reel?.scenes.find((scene) => scene.sceneNumber === activeIndex + 1) ?? null;

  return (
    <div className="space-y-6">
      {banner}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={copyReel}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Reel
        </Button>
      </div>

      {reel?.hook && (
        <div className="mx-auto max-w-2xl rounded-2xl border bg-muted/30 p-5 text-center">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hook</h3>
          <p className="text-lg font-semibold">{reel.hook}</p>
        </div>
      )}

      <MediaSequenceViewer
        items={items}
        total={total || reel?.scenes.length || 0}
        noun="Scene"
        aspectClassName="aspect-[9/16]"
        maxWidthClassName="max-w-xs"
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />

      {activeScene && (
        <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Narration</h3>
            <p className="whitespace-pre-wrap break-words">{activeScene.narration}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Visual</h3>
            <p className="italic text-muted-foreground">{activeScene.visual}</p>
          </div>
        </div>
      )}

      {reel?.script && (
        <details className="mx-auto max-w-2xl rounded-2xl border bg-muted/30 p-5">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">Full script</summary>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm">{reel.script}</p>
        </details>
      )}
    </div>
  );
}
