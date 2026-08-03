import { Compass } from "lucide-react";

import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { Badge } from "@/components/ui/badge";
import { PLANNER_TEXT_FIELDS, type PlannerObject } from "@/lib/ai";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6">{value}</p>
    </div>
  );
}

type PlannerPanelProps = {
  planner: PlannerObject;
};

/**
 * Read-only view of the AI Planner's strategic content plan behind a
 * creation. Keyword intelligence is displayed separately in `KeywordPanel`.
 */
export function PlannerPanel({ planner }: PlannerPanelProps) {
  return (
    <div className="rounded-2xl border p-5 md:p-6">
      <CollapsibleSection
        title="Planner"
        description="Strategic direction behind this generation"
        defaultOpen={false}
        icon={
          <span className="grid size-7 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <Compass className="size-3.5" />
          </span>
        }
      >
        <div className="space-y-6">
          <Badge variant="outline" className="capitalize">
            {planner.contentComplexity} level
          </Badge>

          <div className="grid gap-6 sm:grid-cols-2">
            {PLANNER_TEXT_FIELDS.map(({ key, label }) => (
              <InfoRow key={key} label={label} value={planner[key]} />
            ))}
          </div>

          {planner.audiencePainPoints.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Audience Pain Points
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6">
                {planner.audiencePainPoints.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-2.5 size-1 shrink-0 rounded-full bg-violet-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
