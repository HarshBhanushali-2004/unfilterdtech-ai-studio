"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";

type CaptionCardProps = {
  caption: string;
};

export function CaptionCard({ caption }: CaptionCardProps) {
  const copyCaption = () => copyToClipboard(caption, "Caption copied");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={copyCaption}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Caption
        </Button>
      </div>

      <div className="whitespace-pre-wrap leading-7 text-muted-foreground">
        {caption}
      </div>
    </div>
  );
}