"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EditCreationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  creation: {
    id: string;
    caption: string;
    prompt: string;
  };

  onUpdated: () => void;
};

export function EditCreationDialog({
  open,
  onOpenChange,
  creation,
  onUpdated,
}: EditCreationDialogProps) {
  const [caption, setCaption] = useState(creation.caption);
  const [prompt, setPrompt] = useState(creation.prompt);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!caption.trim()) {
      toast.error("Caption cannot be empty");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/creations/${creation.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ caption, prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success("Creation updated");

      onOpenChange(false);
      onUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update creation"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Creation</DialogTitle>

          <DialogDescription>
            Update the caption or original prompt for this creation.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="space-y-2">
            <p className="text-sm font-medium">Caption</p>

            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[140px]"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Prompt</p>

            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
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

            <Button type="submit" disabled={loading || !caption.trim()}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
