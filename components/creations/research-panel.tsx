import { Sparkles } from "lucide-react";

import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import type { ResearchObject } from "@/lib/ai";

function ResearchList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>

      <ul className="mt-3 space-y-2 text-sm leading-6">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="mt-2.5 size-1 shrink-0 rounded-full bg-violet-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ResearchPanelProps = {
  research: ResearchObject;
};

/**
 * Read-only view of the Research Engine's structured knowledge brief behind
 * a creation — a curated subset of the full Research Object (see
 * `researchObjectSchema`), matching what's most useful to skim here.
 */
export function ResearchPanel({ research }: ResearchPanelProps) {
  return (
    <div className="rounded-2xl border p-5 md:p-6">
      <CollapsibleSection
        title="Research"
        description="Structured knowledge behind this generation"
        defaultOpen={false}
        icon={
          <span className="grid size-7 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <Sparkles className="size-3.5" />
          </span>
        }
      >
        <div className="space-y-8">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Summary
            </h4>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {research.summary}
            </p>
          </div>

          <ResearchList title="Key Facts" items={research.keyFacts} />
          <ResearchList title="Statistics" items={research.statistics} />
          <ResearchList title="Suggested Hooks" items={research.suggestedHooks} />
          <ResearchList title="Content Angles" items={research.contentAngles} />
          <ResearchList title="Questions People Ask" items={research.questionsPeopleAsk} />

          {research.keywords.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Keywords
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {research.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border bg-muted px-3 py-1 text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
