"use client";

import * as React from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

import { friendlyMediaErrorMessage } from "@/lib/format-media/friendly-error";
import { cn } from "@/lib/utils";

type MediaFailedStateProps = {
  errorCode?: string | null;
  errorMessage?: string | null;
  className?: string;
};

/**
 * The clean, honest failure state every media tile (`CarouselSlidesGallery`,
 * `PostMediaPreview`, `StoryFramesGallery`, `ReelScenesGallery`) shows for a
 * FAILED item — replacing the raw provider `errorMessage` that used to be
 * rendered directly inside the media tile as if it were the generated
 * content itself (Phase 1C.6: "provider error is displayed as content").
 *
 * Never shows the raw provider text by default — `friendlyMediaErrorMessage`
 * (keyed off the stable `errorCode`, not the provider's own wording) is the
 * only thing visible until the reviewer explicitly expands "Show details",
 * which is where the actual `errorMessage` (and any provider URL it
 * contains) lives — inspectable for debugging, never mistaken for content.
 *
 * There's no per-slide regenerate endpoint for the Phase 1C plan-based media
 * pipeline (only the whole-creation Regenerate action, in the bottom action
 * bar) — building one is out of scope for this pass, so the hint here points
 * there rather than promising a control that doesn't exist.
 */
export function MediaFailedState({ errorCode, errorMessage, className }: MediaFailedStateProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className={cn("flex h-full flex-col items-center justify-center gap-2 p-4 text-center", className)}>
      <AlertTriangle className="size-5 text-destructive" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Media unavailable</p>
        <p className="text-xs text-muted-foreground">{friendlyMediaErrorMessage(errorCode)}</p>
        <p className="text-xs text-muted-foreground">Use Regenerate below to try again.</p>
      </div>

      {errorMessage && (
        <div className="w-full pt-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowDetails((value) => !value);
            }}
            className="mx-auto flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-muted-foreground"
          >
            <ChevronDown className={cn("size-3 transition-transform", showDetails && "rotate-180")} />
            {showDetails ? "Hide details" : "Show details"}
          </button>

          {showDetails && (
            <p className="mt-1.5 max-h-16 overflow-y-auto break-words rounded bg-black/5 p-2 text-left font-mono text-[10px] leading-snug text-muted-foreground/80 dark:bg-white/5">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
