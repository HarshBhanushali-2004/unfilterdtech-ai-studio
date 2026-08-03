import { Search } from "lucide-react";

import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import type { KeywordIntelligence } from "@/lib/ai";

function KeywordGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((keyword) => (
          <span
            key={keyword}
            className="rounded-full border bg-muted px-3 py-1 text-xs font-medium"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}

type KeywordPanelProps = {
  keywords: KeywordIntelligence;
};

/** Read-only view of the AI Planner's keyword & search-intent strategy. */
export function KeywordPanel({ keywords }: KeywordPanelProps) {
  return (
    <div className="rounded-2xl border p-5 md:p-6">
      <CollapsibleSection
        title="Keyword Analysis"
        description="Search & discovery strategy"
        defaultOpen={false}
        icon={
          <span className="grid size-7 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <Search className="size-3.5" />
          </span>
        }
      >
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search Intent
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {keywords.searchIntent}
            </p>
          </div>

          <KeywordGroup title="Primary Keywords" items={keywords.primaryKeywords} />
          <KeywordGroup title="Secondary Keywords" items={keywords.secondaryKeywords} />
          <KeywordGroup title="LSI Keywords" items={keywords.lsiKeywords} />
          <KeywordGroup title="Semantic Keywords" items={keywords.semanticKeywords} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
