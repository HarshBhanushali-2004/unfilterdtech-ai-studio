"use client";

import * as React from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { displayedMediaType } from "@/lib/format-media/display-media-type";
import type { StoryFrameMediaDTO } from "@/lib/story-plan/types";
import { StoryCard, type StoryFrame } from "./story-card";
import { GeneratedImagesGallery } from "./generated-images-gallery";
import { MediaSequenceViewer, type SequenceItem } from "./media-sequence-viewer";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 120_000;

const MEDIA_TYPE_LABEL: Record<string, string> = { IMAGE: "Image", VIDEO: "Video", NO_MEDIA: "Text" };

function formatFrame(frame: StoryFrame): string {
  return `Story ${frame.frameNumber}\n\nText:\n${frame.text}\n\nVisual Suggestion:\n${frame.visualSuggestion}`;
}

type StoryWorkspaceProps = {
  storyPlanId: string | null;
  frames: StoryFrame[] | null;
  visualPromptId: string | null;
};

/**
 * The Story-specific main workspace (Core Requirement #5) — a vertical,
 * phone-proportioned (9:16) frame-by-frame viewer, deliberately styled
 * differently from Carousel's wider 4:5 slide viewer even though both share
 * the same underlying `MediaSequenceViewer` interaction (prev/next, counter,
 * thumbnail strip) — Stories and Carousels are visually distinct formats on
 * Instagram itself, and the Review page should read that way too.
 */
export function StoryWorkspace({ storyPlanId, frames, visualPromptId }: StoryWorkspaceProps) {
  const [media, setMedia] = React.useState<StoryFrameMediaDTO[] | null>(null);
  const [total, setTotal] = React.useState<number>(frames?.length ?? 0);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (!storyPlanId) return;

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
        setMedia(sorted);
        if (typeof json.totalFrames === "number" && json.totalFrames > 0) setTotal(json.totalFrames);

        const stillGenerating =
          sorted.length < (frames?.length ?? 0) || sorted.some((frame) => !TERMINAL_STATUSES.has(frame.status));
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
  }, [storyPlanId]);

  const copyStories = () => {
    if (!frames || frames.length === 0) return;
    copyToClipboard(frames.map(formatFrame).join("\n\n------------------------\n\n"), "Stories copied");
  };

  if (!storyPlanId) {
    return (
      <div className="space-y-6">
        <GeneratedImagesGallery visualPromptId={visualPromptId} />
        {frames && frames.length > 0 && <StoryCard stories={frames} />}
      </div>
    );
  }

  const items: SequenceItem[] | null =
    media === null
      ? null
      : media.map((frame) => ({
          id: frame.id,
          order: frame.frameOrder,
          status: frame.status,
          renderedImageUrl: frame.renderedImageUrl,
          errorCode: frame.errorCode,
          errorMessage: frame.errorMessage,
          badgeLabel: MEDIA_TYPE_LABEL[displayedMediaType(frame.mediaType, frame.resolutionPath)] ?? "Image",
        }));

  const activeFrame = frames?.find((frame) => frame.frameNumber === activeIndex + 1) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={copyStories}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Stories
        </Button>
      </div>

      <MediaSequenceViewer
        items={items}
        total={total || frames?.length || 0}
        noun="Frame"
        aspectClassName="aspect-[9/16]"
        maxWidthClassName="max-w-xs"
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />

      {activeFrame && (
        <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Text</h3>
            <p className="whitespace-pre-wrap break-words">{activeFrame.text}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Visual Suggestion</h3>
            <p className="italic text-muted-foreground">{activeFrame.visualSuggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}
