"use client"
import * as React from "react"
import { Copy, Download, Loader2, MessageSquareText, RefreshCcw, Save, X } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SelectProjectDialog } from "@/components/projects/select-project-dialog"
import { GeneratedContentSections } from "@/components/creations/generated-content-sections"

import type { GeneratedInstagramContent } from "@/lib/ai"
import { copyToClipboard } from "@/lib/clipboard"
import {
  buildCopyAllText,
  buildCreationMarkdown,
  downloadMarkdown,
  slugify,
} from "@/lib/creation-export"

const EXAMPLE_TOPICS = [
  "5 productivity tips for remote teams",
  "Behind the scenes at our studio",
  "Announcing our new product launch",
  "Customer success story spotlight",
  "Monday motivation quote",
]

type OutputPanelProps = {
  content: GeneratedInstagramContent | null

  projectId?: string | null
  researchId?: string | null
  plannerId?: string | null
  visualPromptId?: string | null
  prompt?: string
  contentType?: string
  tone?: string
  creativity?: number

  onRegenerate?: () => void
  onClear?: () => void
  onExampleSelect?: (topic: string) => void
}

export function OutputPanel({
  content,
  projectId,
  researchId,
  plannerId,
  visualPromptId,
  prompt,
  contentType,
  tone,
  creativity,
  onRegenerate,
  onClear,
  onExampleSelect,
}: OutputPanelProps) {
  const [isSaving, setIsSaving] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const router = useRouter()

  const defaultTitle = content ? content.caption.slice(0, 60) : ""

  const saveCreation = async (
    project: string | null = projectId ?? null,
    title: string = defaultTitle
  ) => {
    if (!content || isSaving) return

    if (!project) {
      if (!dialogOpen) {
        setDialogOpen(true)
      }
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch("/api/creations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project,
          researchId: researchId ?? undefined,
          plannerId: plannerId ?? undefined,
          visualPromptId: visualPromptId ?? undefined,
          title: title.trim() || defaultTitle,
          prompt,
          contentType,
          tone,
          creativity,
          caption: content.caption,
          hashtags: content.hashtags,
          carousel: content.carousel,
          story: content.story,
          reel: content.reel,
          model: "Gemini",
        }),
      })

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success("Creation saved successfully.");

      setDialogOpen(false);

      router.push(`/creations/${result.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save creation."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const copyAll = () => {
    if (!content) return
    copyToClipboard(
      buildCopyAllText({
        title: content.caption.slice(0, 60),
        prompt: prompt ?? "",
        caption: content.caption,
        hashtags: content.hashtags,
        carousel: content.carousel,
        story: content.story,
        reel: content.reel,
      }),
      "Everything copied"
    )
  }

  const downloadAsMarkdown = () => {
    if (!content) return
    downloadMarkdown(
      slugify(content.caption.slice(0, 60)),
      buildCreationMarkdown({
        title: content.caption.slice(0, 60),
        prompt: prompt ?? "",
        caption: content.caption,
        hashtags: content.hashtags,
        carousel: content.carousel,
        story: content.story,
        reel: content.reel,
      })
    )
    toast.success("Markdown file downloaded")
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Generated content</CardTitle>
                {content && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                    Ready
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                {content
                  ? "Review, refine, and adapt your draft for each format."
                  : "Your tailored draft will appear here after generation."}
              </CardDescription>
            </div>

            {content && (
              <div className="flex flex-wrap items-center gap-2">
                {onRegenerate && (
                  <Button variant="outline" size="sm" onClick={onRegenerate}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                )}

                {onClear && (
                  <Button variant="outline" size="sm" onClick={onClear}>
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={copyAll}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All
                </Button>

                <Button variant="outline" size="sm" onClick={downloadAsMarkdown}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>

                <Button size="sm" onClick={() => saveCreation()} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          {content ? (
            <GeneratedContentSections
              caption={content.caption}
              hashtags={content.hashtags}
              carousel={content.carousel}
              story={content.story}
              reel={content.reel}
            />
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/25 px-6 py-10 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <MessageSquareText className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">Ready when you are</h3>
              <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
                Choose a source and format, then generate a content draft tailored to your direction.
              </p>

              <div className="mt-6 w-full max-w-md space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Try an example topic
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {EXAMPLE_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => onExampleSelect?.(topic)}
                      className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-300"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SelectProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={(id, title) => {
          saveCreation(id, title)
        }}
        defaultTitle={defaultTitle}
        saving={isSaving}
      />
    </>
  )
}
