"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandKitBadge } from "@/components/brand-kit/brand-kit-badge";
import { formatDate } from "@/lib/format-date";

export type HistoryCreation = {
  id: string;
  title: string;
  contentType: string;
  createdAt: string;
  project: {
    id: string;
    name: string;
    brandKit?: { id: string; name: string } | null;
  } | null;
};

type HistoryPageClientProps = {
  creations: HistoryCreation[];
  projects: { id: string; name: string }[];
};

type DateRangeFilter = "all" | "today" | "week" | "month" | "custom";

function formatContentType(contentType: string) {
  return contentType.charAt(0) + contentType.slice(1).toLowerCase();
}

function isWithinRange(
  createdAt: string,
  range: DateRangeFilter,
  customFrom: string,
  customTo: string
) {
  if (range === "all") return true;

  const date = new Date(createdAt);
  const now = new Date();

  if (range === "today") {
    return date.toDateString() === now.toDateString();
  }

  if (range === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo && date <= now;
  }

  if (range === "month") {
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    return date >= monthAgo && date <= now;
  }

  // custom
  if (customFrom && date < new Date(customFrom)) return false;
  if (customTo) {
    const to = new Date(customTo);
    to.setHours(23, 59, 59, 999);
    if (date > to) return false;
  }
  return true;
}

export function HistoryPageClient({
  creations,
  projects,
}: HistoryPageClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [items, setItems] = useState(creations);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

      if (!isWithinRange(creation.createdAt, dateRange, customFrom, customTo)) {
        return false;
      }

      return true;
    });
  }, [items, search, projectFilter, contentTypeFilter, dateRange, customFrom, customTo]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((creation) => selected.has(creation.id));

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((current) => {
      if (allFilteredSelected) {
        const next = new Set(current);
        filtered.forEach((creation) => next.delete(creation.id));
        return next;
      }

      const next = new Set(current);
      filtered.forEach((creation) => next.add(creation.id));
      return next;
    });
  }

  async function deleteCreation(id: string) {
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
      setSelected((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
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

  async function bulkDelete() {
    if (selected.size === 0) return;

    try {
      setBulkDeleting(true);

      const res = await fetch("/api/creations/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setItems((current) => current.filter((creation) => !selected.has(creation.id)));
      toast.success(`${selected.size} creation${selected.size === 1 ? "" : "s"} deleted`);
      setSelected(new Set());
      setBulkDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete creations"
      );
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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

        <Select
          value={dateRange}
          onValueChange={(value) => setDateRange(value as DateRangeFilter)}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>

        {dateRange === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-36"
              aria-label="From date"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-36"
              aria-label="To date"
            />
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allFilteredSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all visible creations"
            />
            {selected.size > 0
              ? `${selected.size} selected`
              : "Select all"}
          </label>

          {selected.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selected.size})
            </Button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No creations match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((creation) => (
            <div
              key={creation.id}
              className="flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3 sm:items-center">
                <Checkbox
                  checked={selected.has(creation.id)}
                  onCheckedChange={() => toggleSelected(creation.id)}
                  aria-label={`Select ${creation.title}`}
                  className="mt-1 shrink-0 sm:mt-0"
                />
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{creation.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatContentType(creation.contentType)}</span>
                    <span>•</span>
                    <span>{creation.project?.name ?? "No project"}</span>
                    <span>•</span>
                    <span>{formatDate(creation.createdAt)}</span>
                    {creation.project?.brandKit && (
                      <BrandKitBadge name={creation.project.brandKit.name} />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/creations/${creation.id}?from=history`}>
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

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.size} creation{selected.size === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. All selected creations will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={bulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
