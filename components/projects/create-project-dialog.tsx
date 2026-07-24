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

const COLORS = [
  "#7C3AED",
  "#2563EB",
  "#059669",
  "#EA580C",
  "#DC2626",
  "#DB2777",
];

export function CreateProjectDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);

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
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New project
      </Button>

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