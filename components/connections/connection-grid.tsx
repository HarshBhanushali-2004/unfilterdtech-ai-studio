import type { ConnectionListItem } from "@/lib/connections/dto";

import { ConnectionCard } from "./connection-card";

/**
 * Pure layout — no interactivity of its own, so it stays a Server
 * Component; `ConnectionCard` is the "use client" leaf that owns
 * connect/disconnect state (CLAUDE.md Section 17: keep "use client" small
 * and low in the tree).
 */
export function ConnectionGrid({ connections }: { connections: ConnectionListItem[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {connections.map((connection) => (
        <ConnectionCard key={connection.platform} connection={connection} />
      ))}
    </div>
  );
}
