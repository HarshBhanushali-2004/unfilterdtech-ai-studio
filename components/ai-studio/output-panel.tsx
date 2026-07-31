"use client"
import * as React from "react"
import { Check, Copy, Loader2, MessageSquareText, Save } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SelectProjectDialog } from "@/components/projects/select-project-dialog";
import { useRouter } from "next/navigation";


import type { GeneratedInstagramContent } from "@/lib/ai"

import type { OutputTab } from "./types"

type OutputPanelProps = {
  content: GeneratedInstagramContent | null
  defaultTab: OutputTab

  projectId?: string | null
  prompt?: string
  contentType?: string
  tone?: string
  creativity?: number
}
export function OutputPanel({
    content,
    defaultTab,
    projectId,
    prompt,
    contentType,
    tone,
    creativity,
  }: OutputPanelProps) {
  const [activeTab, setActiveTab] = React.useState<OutputTab>(defaultTab)
  const [copied, setCopied] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const router = useRouter();
  const captionWithHashtags = content ? `${content.caption}\n\n${content.hashtags.map(formatHashtag).join(" ")}` : ""
  const copyCaption = async () => { if (!content) return; await navigator.clipboard?.writeText(captionWithHashtags); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  const saveCreation = async (project: string | null = projectId ?? null) => {
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
          title: content.caption.slice(0, 60),
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
  return (
  <>
    <Card className="min-h-130"><CardHeader className="border-b"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><CardTitle>Generated content</CardTitle>{content && <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">Ready</Badge>}</div><CardDescription className="mt-1">{content ? "Review, refine, and adapt your draft for each format." : "Your tailored draft will appear here after generation."}</CardDescription></div>
  {content && (
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={copyCaption}
    >
      {copied ? (
        <Check className="mr-2 h-4 w-4" />
      ) : (
        <Copy className="mr-2 h-4 w-4" />
      )}

      {copied ? "Copied" : "Copy"}
    </Button>

    <Button
        size="sm"
        onClick={() => saveCreation()}
        disabled={isSaving}
    >
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
  </div></CardHeader><CardContent className="pt-5">{content ? <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OutputTab)}><TabsList className="mb-5 w-full justify-start overflow-x-auto bg-muted/60"><TabsTrigger value="caption">Caption</TabsTrigger><TabsTrigger value="carousel">Carousel</TabsTrigger><TabsTrigger value="story">Story</TabsTrigger><TabsTrigger value="reel">Reel</TabsTrigger></TabsList><TabsContent value="caption" className="mt-0"><p className="whitespace-pre-line text-sm leading-7">{content.caption}</p><div className="mt-5 flex flex-wrap gap-2">{content.hashtags.map((hashtag) => <Badge key={hashtag} variant="secondary">{formatHashtag(hashtag)}</Badge>)}</div></TabsContent><TabsContent value="carousel" className="mt-0"><ol className="space-y-3">{content.carousel.map((slide) => <li key={slide.slideNumber} className="rounded-lg bg-muted/55 p-3 text-sm leading-6"><div className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-300">{slide.slideNumber}</span><div><p className="font-medium">{slide.headline}</p><p className="mt-1 text-muted-foreground">{slide.body}</p><p className="mt-2 text-xs text-muted-foreground">Visual: {slide.visualSuggestion}</p></div></div></li>)}</ol></TabsContent><TabsContent value="story" className="mt-0"><ol className="space-y-3">{content.story.map((frame) => <li key={frame.frameNumber} className="rounded-lg bg-muted/55 p-3 text-sm leading-6"><div className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-300">{frame.frameNumber}</span><div><p>{frame.text}</p><p className="mt-2 text-xs text-muted-foreground">Visual: {frame.visualSuggestion}</p></div></div></li>)}</ol></TabsContent><TabsContent value="reel" className="mt-0"><div className="rounded-lg bg-muted/55 p-3 text-sm leading-6"><p className="font-medium">Hook</p><p className="mt-1">{content.reel.hook}</p><p className="mt-4 font-medium">Script</p><p className="mt-1 whitespace-pre-line text-muted-foreground">{content.reel.script}</p></div><ol className="mt-3 space-y-3">{content.reel.scenes.map((scene) => <li key={scene.sceneNumber} className="rounded-lg bg-muted/55 p-3 text-sm leading-6"><div className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-300">{scene.sceneNumber}</span><div><p>{scene.narration}</p><p className="mt-2 text-xs text-muted-foreground">Visual: {scene.visual}</p></div></div></li>)}</ol></TabsContent></Tabs> : <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/25 px-6 text-center"><span className="grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300"><MessageSquareText className="size-5" /></span><h3 className="mt-4 text-sm font-semibold">Ready when you are</h3><p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">Choose a source and format, then generate a content draft tailored to your direction.</p></div>}</CardContent></Card>

<SelectProjectDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  onSelect={(id) => {
    saveCreation(id)
  }}
  saving={isSaving}
/>
</>
)
}

function formatHashtag(hashtag: string) 
  { return hashtag.startsWith("#") ? hashtag : `#${hashtag.replace(/^#+/, "")}` }
