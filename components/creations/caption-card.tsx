"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type CaptionCardProps = {
  caption: string;
};

export function CaptionCard({ caption }: CaptionCardProps) {
  const copyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    toast.success("Caption copied");
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Caption
        </h2>

        <Button variant="outline" onClick={copyCaption}>
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