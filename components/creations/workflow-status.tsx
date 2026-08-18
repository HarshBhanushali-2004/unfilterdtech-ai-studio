import type { CanvaSyncStatus, CreationStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

type WorkflowStep = "draft" | "editing" | "ready" | "scheduled" | "published";

const STEPS: { key: WorkflowStep; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "editing", label: "Editing" },
  { key: "ready", label: "Ready" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
];

/**
 * Maps the creation's *existing* `CreationStatus`/`CanvaSyncStatus` columns
 * (Prisma schema — no new backend state, per Core Requirement #13) onto the
 * five-step lifecycle the product brief describes. "Editing" is a transient
 * read of an in-progress Canva round trip (`canvaSyncStatus` IMPORTING/
 * EDITING/EXPORTING) layered on top of DRAFT — Canva's own status pill in
 * the bottom action bar still carries the authoritative, live-updating
 * detail; this is only the coarse "where am I" signal for the header.
 */
function currentStep(status: CreationStatus, canvaSyncStatus: CanvaSyncStatus): WorkflowStep {
  if (status === "PUBLISHED") return "published";
  if (status === "SCHEDULED") return "scheduled";
  if (status === "APPROVED") return "ready";
  if (canvaSyncStatus === "IMPORTING" || canvaSyncStatus === "EDITING" || canvaSyncStatus === "EXPORTING") {
    return "editing";
  }
  return "draft";
}

/**
 * A compact "where is this creation right now" strip, Core Requirement #13.
 * Deliberately not a strict linear progress bar — the real workflow can
 * skip steps entirely (Approve & Publish goes straight from Draft to
 * Published, Schedule goes straight from Draft to Scheduled; nothing in the
 * app ever sets `APPROVED` today, see ABOUT.md) — so this never claims a
 * step was "completed" that the creation didn't actually pass through. Only
 * the current step is highlighted; the rest stay neutral labels, not fake
 * checkmarks.
 */
export function WorkflowStatus({
  status,
  canvaSyncStatus,
  className,
}: {
  status: CreationStatus;
  canvaSyncStatus: CanvaSyncStatus;
  className?: string;
}) {
  const active = currentStep(status, canvaSyncStatus);

  return (
    <div className={cn("flex items-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {STEPS.map((step, index) => {
        const isActive = step.key === active;

        return (
          <div key={step.key} className="flex shrink-0 items-center">
            {index > 0 && <div className="h-px w-4 shrink-0 bg-border sm:w-6" />}
            <div
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                isActive ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground/60"
              )}
            >
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
