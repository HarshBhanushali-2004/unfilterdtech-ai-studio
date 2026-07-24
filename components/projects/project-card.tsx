"use client";

import Link from "next/link";
import { FolderOpen, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface ProjectCardProps {
  id: string;
  name: string;
  description: string | null;
  color: string;
  creations?: number;
}

export function ProjectCard({
  id,
  name,
  description,
  color,
  creations = 0,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`}>
      <div className="group relative rounded-2xl border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: color }}
          />

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-5">
          <h3 className="truncate text-lg font-semibold">{name}</h3>

          <p className="mt-1 line-clamp-2 min-h-[40px] text-sm text-muted-foreground">
            {description || "No description"}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span>{creations} creations</span>
          </div>

          <span className="text-xs">Open →</span>
        </div>
      </div>
    </Link>
  );
}