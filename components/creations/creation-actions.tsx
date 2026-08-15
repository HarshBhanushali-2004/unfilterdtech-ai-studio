"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, ImageDown, Pencil, Copy as CopyAllIcon } from "lucide-react";
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
  /** Set only for a CAROUSEL creation made through Phase 1's AI Carousel Engine (see AGENTS.md) — shows the "Download Slides" action, which zips the rendered 1080×1350 PNGs from `GET /api/creations/[id]/carousel/download`. */
  carouselPlanId?: string | null;
  /** Set only for a POST creation made through Phase 1C's Post Planner (see AGENTS.md) — shows the "Download Image" action, `GET /api/creations/[id]/post/download`. */
  postPlanId?: string | null;
  /** Set only for a STORY creation made through Phase 1C's Story Planner (see AGENTS.md) — shows the "Download Frames" action, `GET /api/creations/[id]/story/download`. */
  storyPlanId?: string | null;
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
export function CreationActions({ creation, carouselPlanId, postPlanId, storyPlanId }: CreationActionsProps) {
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

  function downloadCarouselSlides() {
    // A plain navigation (not fetch+blob) — the route's Content-Disposition
    // header is enough for the browser to trigger a native download, same
    // as clicking a direct link.
    window.location.href = `/api/creations/${creation.id}/carousel/download`;
  }

  function downloadPostImage() {
    window.location.href = `/api/creations/${creation.id}/post/download`;
  }

  function downloadStoryFrames() {
    window.location.href = `/api/creations/${creation.id}/story/download`;
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

        {carouselPlanId && (
          <Button
            variant="outline"
            className={actionButtonClass}
            onClick={downloadCarouselSlides}
          >
            <ImageDown className="h-4 w-4" />
            Download Slides
          </Button>
        )}

        {postPlanId && (
          <Button
            variant="outline"
            className={actionButtonClass}
            onClick={downloadPostImage}
          >
            <ImageDown className="h-4 w-4" />
            Download Image
          </Button>
        )}

        {storyPlanId && (
          <Button
            variant="outline"
            className={actionButtonClass}
            onClick={downloadStoryFrames}
          >
            <ImageDown className="h-4 w-4" />
            Download Frames
          </Button>
        )}
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
