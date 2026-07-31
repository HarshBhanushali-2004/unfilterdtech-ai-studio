"use client";

import { useEffect, useState } from "react";
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

type EditProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  project: {
    id: string;
    name: string;
    description: string | null;
    color: string;

    brandKit?: {
      id: string;
      name: string;
    } | null;
  };

  onUpdated: () => void;
};

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onUpdated,
}: EditProjectDialogProps) {
      const [loading, setLoading] = useState(false);

    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(
      project.description ?? ""
    );
    const [color, setColor] = useState(project.color);

    const [brandKitId, setBrandKitId] = useState(
      project.brandKit?.id ?? ""
    );

    const [brandKits, setBrandKits] = useState<
      { id: string; name: string }[]
    >([]);
      useEffect(() => {
      if (!open) return;

      let ignore = false;

      async function loadBrandKits() {
        try {
          const res = await fetch("/api/brand-kit");

          if (!res.ok) {
            if (!ignore) {
              toast.error("Unable to load Brand Kits.");
            }
            return;
          }

          const data = await res.json();

          if (!ignore) {
            setBrandKits(data);
          }
        } catch {
          if (!ignore) {
            toast.error("Unable to load Brand Kits.");
          }
        }
      }

      void loadBrandKits();

      return () => {
        ignore = true;
      };
    }, [open]);
    async function updateProject() {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
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

      toast.success("Project updated");

      onOpenChange(false);
      onUpdated();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>

          <DialogDescription>
            Update your project information.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            updateProject();
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
                <SelectValue placeholder="Select Brand Kit" />
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
            <p className="mb-2 text-sm font-medium">
              Color
            </p>

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
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading || !name.trim()}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}