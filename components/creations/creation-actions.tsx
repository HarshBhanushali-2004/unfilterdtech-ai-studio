"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EditCreationDialog } from "@/components/creations/edit-creation-dialog";

type CreationActionsProps = {
  creation: {
    id: string;
    caption: string;
    prompt: string;
  };
  redirectTo: string;
};

export function CreationActions({
  creation,
  redirectTo,
}: CreationActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteCreation() {
    if (!confirm("Delete this creation? This cannot be undone.")) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/creations/${creation.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success("Creation deleted");

      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete creation"
      );
      setDeleting(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Button>

      <Button
        variant="destructive"
        onClick={deleteCreation}
        disabled={deleting}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {deleting ? "Deleting..." : "Delete"}
      </Button>

      <EditCreationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        creation={creation}
        onUpdated={() => router.refresh()}
      />
    </>
  );
}
