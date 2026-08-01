"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type HistoryCreation = {
  id: string;
  title: string;
  contentType: string;
  createdAt: string;
  project: { id: string; name: string } | null;
};

type HistoryPageClientProps = {
  creations: HistoryCreation[];
  projects: { id: string; name: string }[];
};

function formatContentType(contentType: string) {
  return contentType.charAt(0) + contentType.slice(1).toLowerCase();
}

export function HistoryPageClient({
  creations,
  projects,
}: HistoryPageClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [items, setItems] = useState(creations);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((creation) => {
      if (query && !creation.title.toLowerCase().includes(query)) {
        return false;
      }

      if (projectFilter === "none" && creation.project) {
        return false;
      }

      if (
        projectFilter !== "all" &&
        projectFilter !== "none" &&
        creation.project?.id !== projectFilter
      ) {
        return false;
      }

      if (
        contentTypeFilter !== "all" &&
        creation.contentType !== contentTypeFilter
      ) {
        return false;
      }

      return true;
    });
  }, [items, search, projectFilter, contentTypeFilter]);

  async function deleteCreation(id: string) {
    if (!confirm("Delete this creation? This cannot be undone.")) return;

    try {
      setDeletingId(id);

      const res = await fetch(`/api/creations/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setItems((current) => current.filter((creation) => creation.id !== id));
      toast.success("Creation deleted");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete creation"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectItem value="none">No project</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="POST">Post</SelectItem>
            <SelectItem value="CAROUSEL">Carousel</SelectItem>
            <SelectItem value="STORY">Story</SelectItem>
            <SelectItem value="REEL">Reel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No creations match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((creation) => (
            <div
              key={creation.id}
              className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium">{creation.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatContentType(creation.contentType)}</span>
                  <span>•</span>
                  <span>{creation.project?.name ?? "No project"}</span>
                  <span>•</span>
                  <span>{new Date(creation.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/creations/${creation.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </Link>
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteCreation(creation.id)}
                  disabled={deletingId === creation.id}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
