"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpDown } from "lucide-react";

import { ProjectCard, type ProjectCardProps } from "@/components/projects/project-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortableProject = ProjectCardProps & {
  createdAt: string;
  updatedAt: string;
};

type SortOption = "newest" | "oldest" | "alphabetical";

function sortProjects(projects: SortableProject[], sort: SortOption) {
  const copy = [...projects];

  if (sort === "newest") {
    return copy.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  if (sort === "oldest") {
    return copy.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  return copy.sort((a, b) => a.name.localeCompare(b.name));
}

export function ProjectsGrid({ projects }: { projects: SortableProject[] }) {
  const [sort, setSort] = useState<SortOption>("newest");

  const sorted = useMemo(() => sortProjects(projects, sort), [projects, sort]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
          <SelectTrigger className="w-44" aria-label="Sort projects">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="alphabetical">
              <span className="flex items-center gap-2">
                <ArrowDownAZ className="h-3.5 w-3.5" />
                Alphabetical
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map((project) => (
          <ProjectCard key={project.id} {...project} />
        ))}
      </div>
    </div>
  );
}
