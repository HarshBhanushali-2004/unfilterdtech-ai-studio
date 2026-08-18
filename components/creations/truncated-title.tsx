"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * The Review page's creation title — clamped to two lines so a long
 * AI-generated title (often a full first sentence of the caption, see
 * `OutputPanel`'s `content.caption.slice(0, 60)` default) never dominates
 * the header the way an unbounded `text-4xl` heading used to (Core
 * Requirement #14). Anything actually truncated by the clamp is still
 * fully readable on hover/focus via a tooltip — never permanently hidden.
 */
export function TruncatedTitle({ title }: { title: string }) {
  // A cheap, good-enough truncation signal without a ResizeObserver: the
  // clamp is 2 lines at a large font size, so anything past ~70 characters
  // is realistically going to clip on most viewport widths. Short titles
  // never show the tooltip trigger styling at all.
  const likelyTruncated = title.length > 70;

  const heading = (
    <h1
      tabIndex={likelyTruncated ? 0 : undefined}
      className="line-clamp-2 text-2xl font-bold tracking-tight sm:text-3xl"
    >
      {title}
    </h1>
  );

  if (!likelyTruncated) return heading;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{heading}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm text-wrap">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}
