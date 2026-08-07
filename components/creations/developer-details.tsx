import { Code2 } from "lucide-react";

import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { CopyButton } from "@/components/creations/copy-button";
import { KeywordPanel } from "@/components/creations/keyword-panel";
import { PlannerPanel } from "@/components/creations/planner-panel";
import { QualityScorePanel } from "@/components/creations/quality-score-panel";
import { ResearchPanel } from "@/components/creations/research-panel";
import { SuggestionsPanel } from "@/components/creations/suggestions-panel";
import { VisualAssetsPanel } from "@/components/creations/visual-assets-panel";
import type {
  PlannerObject,
  QualityScore,
  ResearchObject,
  Suggestion,
  VisualPromptObject,
} from "@/lib/ai";

type DeveloperDetailsProps = {
  prompt: string;
  research: ResearchObject | null;
  planner: PlannerObject | null;
  qualityScore: QualityScore | null;
  suggestions: Suggestion[] | null;
  visualPromptId: string | null;
  visualPrompt: VisualPromptObject | null;
};

/**
 * Everything a normal creator never needs to see to approve and publish —
 * the prompt-engineering internals behind this creation (raw source
 * prompt, Research brief, strategic Plan, keyword intelligence, AI Quality
 * Score, and the per-image AI prompts/manual generate controls). Collapsed
 * behind one section, closed by default, rather than deleted — the
 * backend logic behind all of it is untouched (see CLAUDE.md Section 12).
 */
export function DeveloperDetails({
  prompt,
  research,
  planner,
  qualityScore,
  suggestions,
  visualPromptId,
  visualPrompt,
}: DeveloperDetailsProps) {
  return (
    <div className="rounded-2xl border p-5 md:p-6">
      <CollapsibleSection
        title="Developer Details"
        description="Prompt engineering internals — never required to approve or publish"
        defaultOpen={false}
        icon={
          <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
            <Code2 className="size-3.5" />
          </span>
        }
      >
        <div className="space-y-6">
          <div className="rounded-xl border bg-muted/30 p-5">
            <CollapsibleSection title="Prompt Used" defaultOpen={false}>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <CopyButton
                    text={prompt || ""}
                    label="Copy"
                    successMessage="Prompt copied"
                    variant="outline"
                    size="sm"
                  />
                </div>

                <div className="rounded-lg bg-background p-5">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-6">
                    {prompt || "No prompt available."}
                  </pre>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {research && <ResearchPanel research={research} />}
          {planner && <PlannerPanel planner={planner} />}
          {planner && <KeywordPanel keywords={planner.keywordIntelligence} />}
          {qualityScore && <QualityScorePanel scores={qualityScore} />}
          {suggestions && <SuggestionsPanel suggestions={suggestions} />}
          {visualPromptId && visualPrompt && (
            <VisualAssetsPanel visualPromptId={visualPromptId} visualPrompt={visualPrompt} />
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
