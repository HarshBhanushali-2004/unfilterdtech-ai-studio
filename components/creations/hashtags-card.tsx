"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";

type HashtagsCardProps = {
  hashtags: string[];
};

export function HashtagsCard({
  hashtags,
}: HashtagsCardProps) {
  const copyHashtags = () =>
    copyToClipboard(
      hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" "),
      "Hashtags copied"
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={copyHashtags}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Hashtags
        </Button>
      </div>

      {/* Reads as a creator's own hashtag list, not a wall of admin-panel
          badges — individually visible and wrappable, but plain text with a
          brand-colored tint rather than a bordered/filled pill per tag. */}
      <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
        {hashtags.map((tag) => (
          <span key={tag} className="font-medium text-violet-600 dark:text-violet-300">
            #{tag.replace(/^#/, "")}
          </span>
        ))}
      </div>
    </div>
  );
}