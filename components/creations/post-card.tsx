"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";

type PostCardProps = {
  caption: string;
  hashtags: string[];
};

function formatPost(caption: string, hashtags: string[]) {
  if (hashtags.length === 0) return caption;

  const tags = hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");
  return `${caption}\n\n${tags}`;
}

export function PostCard({
  caption,
  hashtags,
}: PostCardProps) {
  const postText = formatPost(caption, hashtags);

  const copyPost = () => copyToClipboard(postText, "Post copied");

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Post
        </h2>

        <Button variant="outline" onClick={copyPost}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Post
        </Button>
      </div>

      <p className="whitespace-pre-wrap leading-7">
        {postText}
      </p>
    </div>
  );
}
