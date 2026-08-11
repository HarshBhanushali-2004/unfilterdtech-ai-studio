import { Suspense } from "react";

import { ConnectionGrid } from "@/components/connections/connection-grid";
import { ConnectionOAuthToast } from "@/components/connections/connection-oauth-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { getConnections } from "@/lib/connections/actions";

// Same static-prerendering trap as /projects and /brand-kit — no dynamic
// API usage for Next to key freshness off of, so without this the page
// gets statically optimized at build time and stops reflecting
// connect/disconnect changes in production.
export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const connections = await getConnections();

  return (
    <>
      {/* useSearchParams() requires a Suspense boundary — same pattern as
          the Studio workspace (CLAUDE.md Section 11). */}
      <Suspense fallback={null}>
        <ConnectionOAuthToast />
      </Suspense>

      <PageHeader
        title="Connections"
        description="Link the platforms you publish to. Nothing posts anywhere yet — this just manages the connection."
      />

      <div className="mt-9">
        <ConnectionGrid connections={connections} />
      </div>
    </>
  );
}
