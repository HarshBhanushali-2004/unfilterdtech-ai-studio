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
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Hashtags
        </h2>

        <Button variant="outline" onClick={copyHashtags}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Hashtags
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {hashtags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border bg-muted px-4 py-2 text-sm font-medium"
          >
            #{tag.replace(/^#/, "")}
          </span>
        ))}
      </div>
    </div>
  );
}