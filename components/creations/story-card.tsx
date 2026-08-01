"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";

export type StoryFrame = {
  frameNumber: number;
  text: string;
  visualSuggestion: string;
};

type StoryCardProps = {
  stories: StoryFrame[];
};

function formatStory(story: StoryFrame) {
  return `Story ${story.frameNumber}\n\nText:\n${story.text}\n\nVisual Suggestion:\n${story.visualSuggestion}`;
}

export function StoryCard({
  stories,
}: StoryCardProps) {
  const copyStories = () =>
    copyToClipboard(
      stories.map(formatStory).join("\n\n------------------------\n\n"),
      "Stories copied"
    );

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Stories
        </h2>

        <Button variant="outline" onClick={copyStories}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Stories
        </Button>
      </div>

      <div className="space-y-6">
        {stories.map((story) => (
          <div
            key={story.frameNumber}
            className="rounded-xl border bg-muted/30 p-5"
          >
            <div className="mb-4">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Story {story.frameNumber}
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                  Text
                </h3>

                <p className="whitespace-pre-wrap break-words">
                  {story.text}
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                  Visual Suggestion
                </h3>

                <p className="italic text-muted-foreground">
                  {story.visualSuggestion}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}