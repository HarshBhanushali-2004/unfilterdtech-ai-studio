"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Copy, Download, Loader2, Pencil, Sparkles, Trash2, X } from "lucide-react";

import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import type { ImagePromptSpec } from "@/lib/ai";
import type { GeneratedImageDTO } from "@/lib/image-generation/types";

/** Extension for a downloaded file, read from the data URL's own mime type — providers don't all return the same format (Gemini: PNG, FLUX: often JPEG). */
function extensionForDataUrl(dataUrl: string): string {
  const subtype = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);/)?.[1]?.toLowerCase();
  if (subtype === "jpeg" || subtype === "jpg") return "jpg";
  if (subtype === "webp") return "webp";
  return "png";
}

/**
 * Indeterminate-but-honest progress: animates toward (never reaching) 92%
 * while a generation request is in flight, resets when it isn't. There's no
 * streaming/progress signal from any Image Provider today (stateless
 * request/response, same as the rest of this app's AI calls), so this is
 * deliberately not a claimed real percentage — it's a "this is moving"
 * indicator, not telemetry.
 */
function useSimulatedProgress(active: boolean): number {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 92 ? prev : prev + Math.max(1, (92 - prev) * 0.08)));
    }, 350);

    return () => {
      clearInterval(interval);
      setProgress(0);
    };
  }, [active]);

  return progress;
}

function SpecField({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-6">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: GeneratedImageDTO["status"] | "GENERATING" }) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          Completed
        </Badge>
      );
    case "GENERATING":
      return (
        <Badge variant="secondary">
          <Loader2 className="size-3 animate-spin" />
          Generating
        </Badge>
      );
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    case "PENDING":
      return <Badge variant="outline">Pending</Badge>;
    default:
      return null;
  }
}

type PromptImageCardProps = {
  title: string;
  prompt: ImagePromptSpec;
  slot: string;
  visualPromptId: string;
  image: GeneratedImageDTO | null | undefined;
  onImageChange: (slot: string, image: GeneratedImageDTO | null) => void;
};

/**
 * A single production-ready AI image prompt, with generation controls
 * layered on top: copy / edit the prompt, generate or regenerate an image
 * against the active Image Provider, preview / download / delete the
 * result. The prompt detail layout (metadata grid, quality keywords,
 * negative prompt) is unchanged from the original read-only panel.
 */
export function PromptImageCard({
  title,
  prompt,
  slot,
  visualPromptId,
  image,
  onImageChange,
}: PromptImageCardProps) {
  const baselinePrompt = image?.promptText || prompt.fullPrompt;

  const [promptText, setPromptText] = React.useState(baselinePrompt);
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(baselinePrompt);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const generationProgress = useSimulatedProgress(isGenerating);

  const isEdited = promptText.trim() !== prompt.fullPrompt.trim();

  async function runGenerate(forceRegenerate: boolean) {
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/visual-prompts/${visualPromptId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
          promptOverride: isEdited ? promptText : undefined,
          forceRegenerate,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error || "Unable to generate this image right now.");
        return;
      }

      const nextImage = json.data as GeneratedImageDTO;
      onImageChange(slot, nextImage);

      if (nextImage.status === "COMPLETED") {
        toast.success("Image generated");
      } else if (nextImage.status === "FAILED") {
        toast.error(nextImage.errorMessage || "Image generation failed.");
      }
    } catch {
      toast.error("Unable to generate this image right now.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDelete() {
    if (!image) return;
    if (!window.confirm("Delete this generated image?")) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/visual-prompts/${visualPromptId}/images/${image.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        toast.error(json.error || "Failed to delete generated image.");
        return;
      }

      onImageChange(slot, null);
      toast.success("Image deleted");
    } catch {
      toast.error("Failed to delete generated image.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDownload() {
    if (!image?.imageUrl) return;

    const link = document.createElement("a");
    link.href = image.imageUrl;
    link.download = `${slot.replace(/\./g, "-")}.${extensionForDataUrl(image.imageUrl)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleEditToggle() {
    if (isEditing) {
      setPromptText(draft.trim() || prompt.fullPrompt);
      setIsEditing(false);
    } else {
      setDraft(promptText);
      setIsEditing(true);
    }
  }

  function handleEditCancel() {
    setDraft(promptText);
    setIsEditing(false);
  }

  const primaryLabel = isGenerating
    ? "Generating…"
    : !image || image.status === "FAILED"
      ? image?.status === "FAILED"
        ? "Retry"
        : "Generate Image"
      : "Regenerate";

  return (
    <div className="rounded-xl border bg-muted/30 p-5">
      <CollapsibleSection title={title} defaultOpen={false}>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={isGenerating ? "GENERATING" : image?.status ?? "PENDING"} />
              {isEdited && (
                <span className="text-xs text-muted-foreground">Prompt edited</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(promptText, "Prompt copied")}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Prompt
              </Button>

              <Button variant="outline" size="sm" onClick={handleEditToggle}>
                <Pencil className="mr-2 h-4 w-4" />
                {isEditing ? "Save Prompt" : "Edit Prompt"}
              </Button>

              {isEditing && (
                <Button variant="ghost" size="sm" onClick={handleEditCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}

              {image?.status === "COMPLETED" && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}

              {image && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => runGenerate(!!image && image.status !== "FAILED")}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {primaryLabel}
              </Button>
            </div>
          </div>

          {isEditing ? (
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-32 text-sm leading-6"
            />
          ) : (
            <p className="whitespace-pre-wrap rounded-lg bg-background p-4 text-sm leading-6 text-muted-foreground">
              {promptText}
            </p>
          )}

          <div className={cn("space-y-3", !isGenerating && !image?.imageUrl && "hidden")}>
            {isGenerating ? (
              <>
                <div className="space-y-1.5">
                  <Progress value={generationProgress} />
                  <p className="text-xs text-muted-foreground">Generating image…</p>
                </div>
                <Skeleton className="h-56 w-full rounded-lg" />
              </>
            ) : image?.imageUrl ? (
              // Data URL stored directly in the DB (no object storage configured) — next/image's
              // optimizer has nothing to do with a base64 image already in memory.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.imageUrl}
                alt={title}
                className="w-full rounded-lg border object-cover"
              />
            ) : null}
          </div>

          {!isGenerating && image?.status === "FAILED" && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{image.errorMessage || "Something went wrong while generating this image."}</p>
            </div>
          )}

          <div className="grid gap-4 border-t pt-6 sm:grid-cols-2">
            <SpecField label="Aspect Ratio" value={prompt.aspectRatio} />
            <SpecField label="Camera Angle" value={prompt.cameraAngle} />
            <SpecField label="Lens Suggestion" value={prompt.lensSuggestion} />
            <SpecField label="Lighting" value={prompt.lighting} />
            <SpecField label="Color Palette" value={prompt.colorPalette} />
            <SpecField label="Environment" value={prompt.environment} />
            <SpecField label="Mood" value={prompt.mood} />
            <SpecField label="Cinematic Style" value={prompt.cinematicStyle} />
            <SpecField label="Rendering Style" value={prompt.renderingStyle} />
            {prompt.typographyGuidance && (
              <SpecField label="Typography Guidance" value={prompt.typographyGuidance} />
            )}
          </div>

          {prompt.qualityKeywords.length > 0 && (
            <div className="border-t pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Quality Keywords
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {prompt.qualityKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border bg-background px-3 py-1 text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Negative Prompt
            </p>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {prompt.negativePrompt}
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
