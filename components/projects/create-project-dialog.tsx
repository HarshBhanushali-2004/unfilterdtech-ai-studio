"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = [
  "#7C3AED",
  "#2563EB",
  "#059669",
  "#EA580C",
  "#DC2626",
  "#DB2777",
];

export type CreatedProject = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
};

type CreateProjectDialogProps = {
  /** Controlled open state. Omit to manage open/closed internally (default usage). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the newly created project after a successful save. */
  onCreated?: (project: CreatedProject) => void;
  /** Hide the built-in "New project" trigger button, e.g. when embedding this
   * dialog inside another flow that supplies its own trigger. */
  hideTrigger?: boolean;
};

export function CreateProjectDialog({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  onCreated,
  hideTrigger = false,
}: CreateProjectDialogProps = {}) {
  const router = useRouter();

  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? openProp : internalOpen;

  function setOpen(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChangeProp?.(nextOpen);
  }

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [brandKits, setBrandKits] = useState<
      { id: string; name: string }[]
    >([]);
  useEffect(() => {
  async function loadBrandKits() {
      try {
        const res = await fetch("/api/brand-kit");

        if (!res.ok) {
          toast.error("Unable to load Brand Kits.");
          return;
        }

        const data = await res.json();
        setBrandKits(data);
      } catch {
        toast.error("Unable to load Brand Kits.");
      }
    }

    loadBrandKits();
  }, []);

const [brandKitId, setBrandKitId] =
  useState("");

  async function createProject() {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          color,
          brandKitId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success("Project created");

      setOpen(false);
      setName("");
      setDescription("");
      setColor(COLORS[0]);

      router.refresh();
      onCreated?.(data);
    } catch (error) {
    const message =
    error instanceof Error ? error.message : "Something went wrong";
    toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!hideTrigger && (
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New project
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>

            <DialogDescription>
              Organize your AI creations into projects.
            </DialogDescription>
          </DialogHeader>

        <form
        className="space-y-4"
        onSubmit={(e) => {
            e.preventDefault();
            createProject();
        }}
        >
            <Input
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Brand Kit
              </p>

              <Select
                value={brandKitId}
                onValueChange={setBrandKitId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a Brand Kit (optional)" />
                </SelectTrigger>

                <SelectContent>
                  {brandKits.map((brand) => (
                    <SelectItem
                      key={brand.id}
                      value={brand.id}
                    >
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Color</p>

              <div className="flex flex-wrap gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`relative h-9 w-9 rounded-full transition-all ${
                        color === c
                        ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                    >
                    {color === c && (
                        <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-white" />
                        </div>
                    )}
                    </button>
                ))}
              </div>
          </div>

          <DialogFooter>
            <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
            >
            Cancel
            </Button>

            <Button
            type="submit" 
            disabled={loading || !name.trim()}
            >
                  {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}