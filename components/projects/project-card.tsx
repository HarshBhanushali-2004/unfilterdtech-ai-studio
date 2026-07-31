"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { ProjectActions } from "./project-actions";
import { EditProjectDialog } from "./edit-project-dialog";


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
}

export function ProjectCard({
  id,
  name,
  description,
  color,
  brandKit,
  creations = 0,
}: ProjectCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  async function deleteProject() {
    if (!confirm("Delete this project?")) return;

    try {
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
    }
  }
  return (
  <>
    <div className="group relative rounded-2xl border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg">
      <div className="absolute right-6 top-6 z-10">
        <ProjectActions
          onEdit={() => setEditOpen(true)}
          onDelete={deleteProject}
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
            <div className="mt-3 inline-flex items-center rounded-full border px-2 py-1 text-xs">
              🏷 {brandKit.name}
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
    </>
  );
}