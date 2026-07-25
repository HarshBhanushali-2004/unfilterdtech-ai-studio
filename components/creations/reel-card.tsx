"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ReelScene = {
  sceneNumber: number;
  narration: string;
  visual: string;
};

type Reel = {
  hook: string;
  scenes: ReelScene[];
  cta: string;
};

type ReelCardProps = {
  reel: Reel;
};

export function ReelCard({
  reel,
}: ReelCardProps) {
  const copyReel = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(reel, null, 2)
    );

    toast.success("Reel copied");
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Reel
        </h2>

        <Button variant="outline" onClick={copyReel}>
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

        <div className="rounded-xl border bg-muted/30 p-5">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Call To Action
          </h3>

          <p>{reel.cta}</p>
        </div>
      </div>
    </div>
  );
}