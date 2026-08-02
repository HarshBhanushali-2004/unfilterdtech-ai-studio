"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Pencil, Trash2, Copy as CopyAllIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { EditCreationDialog } from "@/components/creations/edit-creation-dialog";
import { copyToClipboard } from "@/lib/clipboard";
import {
  buildCopyAllText,
  buildCreationMarkdown,
  downloadMarkdown,
  slugify,
  type ExportableCreation,
} from "@/lib/creation-export";

type CreationActionsProps = {
  creation: ExportableCreation & {
    id: string;
  };
  redirectTo: string;
};

const actionButtonClass = "h-9 gap-2 rounded-lg px-3.5";

export function CreationActions({
  creation,
  redirectTo,
}: CreationActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function deleteCreation() {
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
      setDeleteOpen(false);
    }
  }

  async function duplicateCreation() {
    if (duplicating) return;

    try {
      setDuplicating(true);

      const res = await fetch(`/api/creations/${creation.id}/duplicate`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success("Creation duplicated");

      router.push(`/creations/${data.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to duplicate creation"
      );
      setDuplicating(false);
    }
  }

  function copyCaption() {
    copyToClipboard(creation.caption, "Caption copied");
  }

  function copyAll() {
    copyToClipboard(buildCopyAllText(creation), "Everything copied");
  }

  function downloadAsMarkdown() {
    downloadMarkdown(slugify(creation.title), buildCreationMarkdown(creation));
    toast.success("Markdown file downloaded");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className={actionButtonClass}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>

        <Button
          variant="outline"
          className={actionButtonClass}
          onClick={duplicateCreation}
          disabled={duplicating}
        >
          <Copy className="h-4 w-4" />
          {duplicating ? "Duplicating..." : "Duplicate"}
        </Button>

        <Button
          variant="outline"
          className={actionButtonClass}
          onClick={copyCaption}
        >
          <Copy className="h-4 w-4" />
          Copy Caption
        </Button>

        <Button
          variant="outline"
          className={actionButtonClass}
          onClick={copyAll}
        >
          <CopyAllIcon className="h-4 w-4" />
          Copy All
        </Button>

        <Button
          variant="outline"
          className={actionButtonClass}
          onClick={downloadAsMarkdown}
        >
          <Download className="h-4 w-4" />
          Download Markdown
        </Button>

        <Button
          variant="destructive"
          className={actionButtonClass}
          onClick={() => setDeleteOpen(true)}
          disabled={deleting}
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>

      <EditCreationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        creation={creation}
        onUpdated={() => router.refresh()}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this creation?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The creation and all of its generated
              content will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={deleteCreation}
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
