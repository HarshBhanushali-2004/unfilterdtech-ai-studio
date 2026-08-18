import type { ContentType } from "@prisma/client";
import { GalleryVerticalEnd, ImageIcon, PanelsTopLeft, Video, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The one badge that tells a reviewer, at a glance and before reading
 * anything else, which of the four formats this creation actually is
 * (Core Requirement #1 — "format-first experience"). Icon choice mirrors
 * `ContentTypeSelector` exactly (`components/ai-studio/content-type-selector.tsx`)
 * so the same visual vocabulary carries from "what I picked in the Studio"
 * to "what I'm reviewing here."
 */
const FORMAT_CONFIG: Record<ContentType, { label: string; icon: LucideIcon }> = {
  POST: { label: "Post", icon: ImageIcon },
  CAROUSEL: { label: "Carousel", icon: PanelsTopLeft },
  STORY: { label: "Story", icon: GalleryVerticalEnd },
  REEL: { label: "Reel", icon: Video },
};

export function FormatBadge({ contentType, className }: { contentType: ContentType; className?: string }) {
  const { label, icon: Icon } = FORMAT_CONFIG[contentType];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-700 px-3 py-1 text-xs font-semibold text-white shadow-sm",
        className
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
