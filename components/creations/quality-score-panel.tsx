import { Gauge } from "lucide-react";

import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { Progress } from "@/components/ui/progress";
import { QUALITY_SCORE_FIELDS, type QualityScore } from "@/lib/ai";
import { cn } from "@/lib/utils";

function scoreTone(value: number) {
  if (value >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (value >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

type QualityScorePanelProps = {
  scores: QualityScore;
};

/** Read-only view of the post-generation AI Quality Score evaluation. */
export function QualityScorePanel({ scores }: QualityScorePanelProps) {
  return (
    <div className="rounded-2xl border p-5 md:p-6">
      <CollapsibleSection
        title="Quality Scores"
        description="AI evaluation of this creation"
        defaultOpen={false}
        icon={
          <span className="grid size-7 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <Gauge className="size-3.5" />
          </span>
        }
      >
        <div className="space-y-8">
          <div className="flex items-center gap-4 rounded-xl bg-muted/40 p-5">
            <span className={cn("text-3xl font-bold", scoreTone(scores.overall))}>
              {scores.overall}
            </span>
            <div>
              <p className="text-sm font-semibold">Overall Score</p>
              <p className="text-xs text-muted-foreground">out of 100</p>
            </div>
          </div>

          <div className="space-y-5">
            {QUALITY_SCORE_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-medium text-muted-foreground">{scores[key]}%</span>
                </div>
                <Progress value={scores[key]} />
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
