"use client";

import { Copy, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type CreationHeaderProps = {
  title: string;
  contentType: string;
  model: string | null;
  createdAt: Date;
};

export function CreationHeader({
  title,
  contentType,
  model,
  createdAt,
}: CreationHeaderProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          {title}
        </h1>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full border px-3 py-1">
            {contentType}
          </span>

          {model && (
            <span className="rounded-full border px-3 py-1">
              {model}
            </span>
          )}

          <span>
            {createdAt.toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline">
          <Copy className="mr-2 h-4 w-4" />
          Copy All
        </Button>

        <Button variant="outline">
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>

        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}