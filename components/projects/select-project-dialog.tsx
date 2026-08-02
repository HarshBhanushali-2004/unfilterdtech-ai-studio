"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, FolderPlus, FolderX, Loader2, Save as SaveIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { BrandKitBadge } from "@/components/brand-kit/brand-kit-badge";

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  brandKitId?: string | null;
};

type BrandKitOption = {
  id: string;
  name: string;
};

const FALLBACK_COLOR = "#7C3AED";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (projectId: string, title: string) => void;
  /** Prefilled title, e.g. derived from the caption. */
  defaultTitle?: string;
  /** Whether the parent is currently saving the creation into `selected`. */
  saving?: boolean;
};

export function SelectProjectDialog({
  open,
  onOpenChange,
  onSelect,
  defaultTitle = "",
  saving = false,
}: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [brandKits, setBrandKits] = useState<BrandKitOption[]>([]);
  const [selected, setSelected] = useState("");
  const [title, setTitle] = useState(defaultTitle);
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

        const [projectsRes, brandKitsRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/brand-kit"),
        ]);
        const data = await projectsRes.json();

        if (!projectsRes.ok) {
          throw new Error(data.error);
        }

        setProjects(data);

        if (brandKitsRes.ok) {
          setBrandKits(await brandKitsRes.json());
        }
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

  const brandKitsById = useMemo(() => {
    const map = new Map<string, string>();
    brandKits.forEach((brand) => map.set(brand.id, brand.name));
    return map;
  }, [brandKits]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selected) ?? null,
    [projects, selected]
  );

  const selectedBrandKitName = selectedProject?.brandKitId
    ? brandKitsById.get(selectedProject.brandKitId) ?? null
    : null;

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
        setTitle(defaultTitle);
        setShowCreate(false);
      }

      await loadProjects();
    }

    void resetAndLoad();

    return () => {
      ignore = true;
    };
  }, [open, loadProjects, defaultTitle]);

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
        <DialogContent className="max-w-lg gap-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white">
                <SaveIcon className="size-4.5" />
              </span>
              <div>
                <DialogTitle>Save your creation</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Choose where this lives and give it a name.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="creation-title">Title</Label>
            <Input
              id="creation-title"
              placeholder="Untitled creation"
              value={title}
              maxLength={60}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Project</Label>
              {selectedBrandKitName && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Brand Kit
                  <BrandKitBadge name={selectedBrandKitName} />
                </div>
              )}
            </div>

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
                {filteredProjects.map((project) => {
                  const brandKitName = project.brandKitId
                    ? brandKitsById.get(project.brandKitId)
                    : null;

                  return (
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
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{project.name}</span>

                            {selected === project.id && (
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                            )}
                          </div>

                          {project.description && (
                            <p className="text-sm text-muted-foreground">
                              {project.description}
                            </p>
                          )}

                          {brandKitName && (
                            <div className="mt-2">
                              <BrandKitBadge name={brandKitName} />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              disabled={!selected || saving}
              onClick={() => onSelect(selected, title)}
            >
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
