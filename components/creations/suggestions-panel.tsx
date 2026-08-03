import { Lightbulb } from "lucide-react";

import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import type { Suggestion } from "@/lib/ai";

type SuggestionsPanelProps = {
  suggestions: Suggestion[];
};

/**
 * Read-only view of the AI Suggestions from the post-generation evaluation.
 * Display-only — suggestions are never applied automatically.
 */
export function SuggestionsPanel({ suggestions }: SuggestionsPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-2xl border p-5 md:p-6">
      <CollapsibleSection
        title="AI Suggestions"
        description="Ideas to improve this creation — nothing is applied automatically"
        defaultOpen={false}
        icon={
          <span className="grid size-7 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <Lightbulb className="size-3.5" />
          </span>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {suggestions.map((suggestion, index) => (
            <div key={index} className="rounded-xl border bg-muted/30 p-5">
              <p className="text-sm font-semibold">{suggestion.label}</p>
              <p className="mt-2 text-sm text-muted-foreground">{suggestion.detail}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
