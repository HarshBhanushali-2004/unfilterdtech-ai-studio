"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { ProjectActions } from "./project-actions";
import { EditProjectDialog } from "./edit-project-dialog";
import { BrandKitBadge } from "@/components/brand-kit/brand-kit-badge";
import { formatDate } from "@/lib/format-date";
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


export interface ProjectCardProps {
  id: string;
  name: string;
  description: string | null;
  color: string;

  brandKit?: {
    id: string;
    name: string;
  } | null;

  creations?: number;
  updatedAt?: string;
}

export function ProjectCard({
  id,
  name,
  description,
  color,
  brandKit,
  creations = 0,
  updatedAt,
}: ProjectCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteProject() {
    try {
      setDeleting(true);

      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success("Project deleted");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete project"
      );
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }
  return (
  <>
    <div className="group relative rounded-2xl border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg">
      <div className="absolute right-6 top-6 z-10">
        <ProjectActions
          onEdit={() => setEditOpen(true)}
          onDelete={() => setDeleteOpen(true)}
        />
      </div>

      <Link href={`/projects/${id}`} className="block">
        <div className="flex items-start justify-between">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>

        <div className="mt-5">
          <h3 className="truncate text-lg font-semibold">{name}</h3>

          <p className="mt-1 line-clamp-2 min-h-[40px] text-sm text-muted-foreground">
            {description || "No description"}
          </p>
          {brandKit && (
            <div className="mt-3">
              <BrandKitBadge name={brandKit.name} />
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span>{creations} creations</span>
          </div>

          <span className="text-xs">Open →</span>
        </div>

        {updatedAt && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            <span>Updated {formatDate(updatedAt)}</span>
          </div>
        )}
      </Link>
    </div>
      <EditProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={{
          id,
          name,
          description,
          color,
          brandKit,
        }}
        onUpdated={() => router.refresh()}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Creations in this project will be kept
              but unlinked from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={deleteProject}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}