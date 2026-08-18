import type { CanvaSyncStatus } from "@prisma/client";
import { AlertTriangle, CheckCircle2, Loader2, PenLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

/**
 * The Review page's Canva-link status indicator (Phase 2 — "Edit in
 * Canva", see CANVA_NEXT_PHASE_PLAN.md §9). Mirrors
 * `components/connections/connection-status-badge.tsx`'s exact visual
 * language (outline Badge, borderless tint, small leading icon) so this
 * reads as the same kind of status the Connections page already shows,
 * not a new pattern.
 *
 * Renders nothing for `NOT_LINKED` — the large majority of Posts will
 * never touch Canva at all (this app's own "AI generates everything,
 * Regenerate if unhappy" philosophy, CLAUDE.md Section 12), and an empty
 * "Not linked" pill on every single Post would be pure noise.
 */
const STATUS_CONFIG: Partial<
  Record<CanvaSyncStatus, { label: string; className: string; icon: typeof CheckCircle2; spin?: boolean }>
> = {
  IMPORTING: {
    label: "Importing to Canva…",
    className: "bg-muted text-muted-foreground",
    icon: Loader2,
    spin: true,
  },
  EDITING: {
    label: "Editing in Canva",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    icon: PenLine,
  },
  EXPORTING: {
    label: "Syncing from Canva…",
    className: "bg-muted text-muted-foreground",
    icon: Loader2,
    spin: true,
  },
  SYNCED: {
    label: "Synced from Canva",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Canva sync failed",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: AlertTriangle,
  },
};

export function CanvaStatusPill({
  status,
  lastSyncedAt,
  className,
}: {
  status: CanvaSyncStatus;
  lastSyncedAt: string | null;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", config.className, className)}>
      <Icon className={cn("size-3", config.spin && "animate-spin")} />
      {status === "SYNCED" && lastSyncedAt ? `Synced ${formatDate(lastSyncedAt)}` : config.label}
    </Badge>
  );
}
