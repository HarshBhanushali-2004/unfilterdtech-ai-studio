"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";

/**
 * A Post's structured content — headline/body/CTA (`PostPlan.data`, see
 * `prisma/schema.prisma`) — distinct from `caption` (the Instagram caption
 * text, generated separately and shown in `PostCard`). Until now nothing on
 * the Review page ever showed this; only the server-side renderer read it,
 * to bake it into the post image. Mirrors `CarouselCard`/`StoryCard`/
 * `ReelCard`'s exact visual convention (a single "rounded-xl border
 * bg-muted/30" block, muted section labels, a Copy action) rather than
 * introducing a new style.
 */
export type PostPlanContent = {
  headline: string;
  body: string;
  cta: string;
};

function formatPostContent(content: PostPlanContent): string {
  return [
    content.headline && `Headline:\n${content.headline}`,
    content.body && `Body:\n${content.body}`,
    content.cta && `CTA:\n${content.cta}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function PostContentCard({ content }: { content: PostPlanContent }) {
  const copyContent = () => copyToClipboard(formatPostContent(content), "Post content copied");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={copyContent}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Content
        </Button>
      </div>

      <div className="rounded-xl border bg-muted/30 p-5">
        <div className="space-y-5">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Headline</h3>
            <p className="text-lg font-semibold">{content.headline}</p>
          </div>

          {content.body && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Body</h3>
              <p className="whitespace-pre-wrap break-words">{content.body}</p>
            </div>
          )}

          {content.cta && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-muted-foreground">CTA</h3>
              <p className="whitespace-pre-wrap break-words">{content.cta}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
