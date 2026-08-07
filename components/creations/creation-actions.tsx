"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Pencil, Copy as CopyAllIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
};

const actionButtonClass = "h-9 gap-2 rounded-lg px-3.5";

/**
 * Secondary utility actions (Edit / Duplicate / Copy Caption / Copy All /
 * Download) — compact outline buttons directly in the header, not tucked
 * behind a menu. Deliberately separate from the Review page's primary
 * bottom action bar (Approve & Publish / Schedule / Regenerate / Delete):
 * these are frequently-used utilities, not the core approve/publish
 * workflow, but "frequently used" still means "no extra click to reach."
 */
export function CreationActions({ creation }: CreationActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

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
          Download
        </Button>
      </div>

      <EditCreationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        creation={creation}
        onUpdated={() => router.refresh()}
      />
    </>
  );
}
