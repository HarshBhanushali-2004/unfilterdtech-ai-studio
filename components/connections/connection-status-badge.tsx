import type { ConnectionStatus } from "@prisma/client";
import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  CONNECTED: {
    label: "Connected",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  // Token couldn't be silently refreshed (see lib/connections/token-refresh.ts)
  // — the account and its last-known details are kept, just needs a fresh
  // OAuth round-trip.
  EXPIRED: {
    label: "Reconnect needed",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: AlertTriangle,
  },
  DISCONNECTED: {
    label: "Not connected",
    className: "bg-muted text-muted-foreground",
    icon: CircleDashed,
  },
};

export function ConnectionStatusBadge({
  status,
  className,
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", config.className, className)}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
