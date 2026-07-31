"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, FolderPlus, FolderX, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
};

const FALLBACK_COLOR = "#7C3AED";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (projectId: string) => void;
  /** Whether the parent is currently saving the creation into `selected`. */
  saving?: boolean;
};

export function SelectProjectDialog({
  open,
  onOpenChange,
  onSelect,
  saving = false,
}: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [showCreate, setShowCreate] = useState(false);

  const loadProjects = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        setLoading(true);

        if (!options?.silent) {
          setLoadError(false);
        }

        const res = await fetch("/api/projects");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error);
        }

        setProjects(data);
      } catch {
        if (options?.silent) {
          // A project was already created and selected successfully — a
          // failed refresh here shouldn't blow away that selection or
          // replace the picker with an error state. Just let the user know.
          toast.error(
            "Project created, but the project list couldn't be refreshed."
          );
        } else {
          setLoadError(true);
          toast.error("Unable to load projects");
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      project.name.toLowerCase().includes(query)
    );
  }, [projects, search]);

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    // Start every visit to this dialog from a clean slate — nothing
    // preselected, no leftover search text, and the freshest project list.
    // This runs off the `open` prop itself (not the Radix onOpenChange
    // callback) so it fires reliably even though this dialog has no
    // internal DialogTrigger — it's opened purely by a parent state change.
    async function resetAndLoad() {
      if (!ignore) {
        setSelected("");
        setSearch("");
        setShowCreate(false);
      }

      await loadProjects();
    }

    void resetAndLoad();

    return () => {
      ignore = true;
    };
  }, [open, loadProjects]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          // While a save is in flight, ignore Escape, overlay clicks, and
          // the dialog's own close button — only the (disabled-while-saving)
          // Cancel button's explicit call reaches onOpenChange in that case.
          if (saving && !nextOpen) return;
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save Creation</DialogTitle>

            <DialogDescription>
              Choose an existing project or create a new one.
            </DialogDescription>
          </DialogHeader>

          {!loading && !loadError && projects.length > 0 && (
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search projects"
            />
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
              <FolderX className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load your projects. You can still create a new
                one below.
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {projects.length === 0
                ? "No projects yet. Create one below to get started."
                : "No projects match your search."}
            </div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelected(project.id)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    selected === project.id
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{
                        backgroundColor: project.color ?? FALLBACK_COLOR,
                      }}
                    />

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{project.name}</span>

                        {selected === project.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>

                      {project.description && (
                        <p className="text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowCreate(true)}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Create New Project
          </Button>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button disabled={!selected || saving} onClick={() => onSelect(selected)}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Here"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reuses the same project creation flow/component used elsewhere in
          the app instead of duplicating the create-project form here. */}
      <CreateProjectDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        hideTrigger
        onCreated={(project) => {
          setSelected(project.id);
          setShowCreate(false);
          void loadProjects({ silent: true });
        }}
      />
    </>
  );
}
