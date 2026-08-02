"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";

export type ReelScene = {
  sceneNumber: number;
  narration: string;
  visual: string;
};

export type Reel = {
  hook: string;
  script: string;
  scenes: ReelScene[];
};

type ReelCardProps = {
  reel: Reel;
};

function formatReel(reel: Reel) {
  const scenesText = reel.scenes
    .map(
      (scene) =>
        `Scene ${scene.sceneNumber}\n\nNarration:\n${scene.narration}\n\nVisual:\n${scene.visual}`
    )
    .join("\n\n------------------------\n\n");

  return `Hook\n\n${reel.hook}\n\nScript\n\n${reel.script}\n\n------------------------\n\n${scenesText}`;
}

export function ReelCard({
  reel,
}: ReelCardProps) {
  const copyReel = () => copyToClipboard(formatReel(reel), "Reel copied");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={copyReel}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Reel
        </Button>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border bg-muted/30 p-5">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Hook
          </h3>

          <p className="text-lg font-semibold">
            {reel.hook}
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-5">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Script
          </h3>

          <p className="whitespace-pre-wrap break-words">
            {reel.script}
          </p>
        </div>

        {reel.scenes?.map((scene) => (
          <div
            key={scene.sceneNumber}
            className="rounded-xl border bg-muted/30 p-5"
          >
            <div className="mb-4">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Scene {scene.sceneNumber}
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                  Narration
                </h3>

                <p className="whitespace-pre-wrap break-words">
                  {scene.narration}
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                  Visual
                </h3>

                <p className="italic text-muted-foreground">
                  {scene.visual}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}