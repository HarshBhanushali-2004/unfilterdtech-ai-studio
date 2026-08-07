"use client";

import * as React from "react";
import { AlertTriangle, ImageOff, Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { GeneratedImageDTO } from "@/lib/image-generation/types";

const SLOT_LABELS: Record<string, string> = {
  "post.mainImage": "Main Image",
  "story.background": "Background",
  "story.foreground": "Foreground",
  "reel.thumbnail": "Thumbnail",
  "reel.cover": "Cover",
};

function slotLabel(slot: string): string {
  if (SLOT_LABELS[slot]) return SLOT_LABELS[slot];
  const match = slot.match(/^carousel\.slide\.(\d+)$/);
  return match ? `Slide ${match[1]}` : slot;
}

/** Stable, human-sensible order — carousel slides numerically, everything else by first appearance in SLOT_LABELS. */
function slotSortKey(slot: string): number {
  const match = slot.match(/^carousel\.slide\.(\d+)$/);
  if (match) return Number(match[1]);
  const index = Object.keys(SLOT_LABELS).indexOf(slot);
  return index === -1 ? 99 : index;
}

type GeneratedImagesGalleryProps = {
  visualPromptId: string | null;
};

/**
 * Read-only display of the images AI already generated for this creation —
 * the Review page's "Generated Images" section. Deliberately has none of
 * `PromptImageCard`'s manual controls (edit prompt, per-slot regenerate) —
 * those move to Developer Details (`VisualAssetsPanel`). A creator here
 * only ever sees the result, never the prompt engineering behind it.
 */
export function GeneratedImagesGallery({ visualPromptId }: GeneratedImagesGalleryProps) {
  const [images, setImages] = React.useState<GeneratedImageDTO[] | null>(visualPromptId ? null : []);

  React.useEffect(() => {
    if (!visualPromptId) return;

    let cancelled = false;

    fetch(`/api/visual-prompts/${visualPromptId}/images`)
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled && Array.isArray(json.data)) {
          setImages([...json.data].sort((a, b) => slotSortKey(a.slot) - slotSortKey(b.slot)));
        }
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      });

    return () => {
      cancelled = true;
    };
  }, [visualPromptId]);

  if (images === null) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <ImageOff className="size-5" />
        No images yet — click Regenerate below to create them.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {images.map((image) => (
        <div key={image.id} className="space-y-2">
          <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
            {image.status === "COMPLETED" && image.imageUrl ? (
              // Data URL stored directly in the DB (no object storage configured).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.imageUrl}
                alt={slotLabel(image.slot)}
                className="h-full w-full object-cover"
              />
            ) : image.status === "FAILED" ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 p-3 text-center text-xs text-destructive">
                <AlertTriangle className="size-4" />
                Generation failed
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <p className="text-center text-xs font-medium text-muted-foreground">
            {slotLabel(image.slot)}
          </p>
        </div>
      ))}
    </div>
  );
}
