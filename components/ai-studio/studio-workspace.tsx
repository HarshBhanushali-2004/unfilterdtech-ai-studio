"use client"

import * as React from "react"
import { AlertCircle, Sparkles } from "lucide-react"

import { ContentTypeSelector } from "@/components/ai-studio/content-type-selector"
import { GenerationProgress } from "@/components/ai-studio/generation-progress"
import { GenerationSettings } from "@/components/ai-studio/generation-settings"
import { OutputPanel } from "@/components/ai-studio/output-panel"
import { SourceSelector } from "@/components/ai-studio/source-selector"
import type { ContentType, OutputTab, SourceType } from "@/components/ai-studio/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { GeneratedInstagramContent } from "@/lib/ai"

const outputTabByContentType: Record<ContentType, OutputTab> = { post: "caption", carousel: "carousel", story: "story", reel: "reel" }
const apiContentTypeByContentType = { post: "instagram_post", carousel: "carousel", story: "story", reel: "reel" } as const

type GenerateApiResponse = {
  data?: GeneratedInstagramContent
  error?: string
}

export function StudioWorkspace() {
  const [sourceType, setSourceType] = React.useState<SourceType>("topic")
  const [sourceValues, setSourceValues] = React.useState<Record<SourceType, string>>({ topic: "", text: "", url: "" })
  const [contentType, setContentType] = React.useState<ContentType>("post")
  const [tone, setTone] = React.useState("confident")
  const [creativity, setCreativity] = React.useState(55)
  const [generatedContent, setGeneratedContent] = React.useState<GeneratedInstagramContent | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const sourceValue = sourceValues[sourceType]
  const generate = async () => {
    if (!sourceValue.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          input: sourceValue,
          contentTypes: [apiContentTypeByContentType[contentType]],
          tone,
          creativity,
        }),
      })
      const payload = (await response.json()) as GenerateApiResponse

      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Unable to generate content right now.")

      setGeneratedContent(payload.data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate content right now.")
    } finally {
      setIsLoading(false)
    }
  }

  const clearGeneratedContent = () => { setGeneratedContent(null); setError(null) }
  const handleSourceTypeChange = (nextSourceType: SourceType) => { setSourceType(nextSourceType); clearGeneratedContent() }
  const handleSourceValueChange = (type: SourceType, value: string) => { setSourceValues((current) => ({ ...current, [type]: value })); clearGeneratedContent() }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start"><Card><CardContent className="space-y-7 pt-6"><SourceSelector sourceType={sourceType} values={sourceValues} onSourceTypeChange={handleSourceTypeChange} onValueChange={handleSourceValueChange} /><ContentTypeSelector value={contentType} onChange={(value) => { setContentType(value); clearGeneratedContent() }} /><GenerationSettings tone={tone} creativity={creativity} onToneChange={(value) => { setTone(value); clearGeneratedContent() }} onCreativityChange={(value) => { setCreativity(value); clearGeneratedContent() }} /><Button className="w-full bg-violet-600 text-white hover:bg-violet-700" size="lg" disabled={!sourceValue.trim() || isLoading} onClick={generate}>{isLoading ? <><Sparkles className="animate-pulse" />Generating content…</> : <><Sparkles />Generate {contentType === "post" ? "Instagram post" : contentType}</>}</Button></CardContent></Card><div className="space-y-6">{isLoading ? <GenerationProgress progress={55} /> : error ? <GenerationError message={error} /> : <OutputPanel key={`${contentType}-${generatedContent ? "generated" : "empty"}`} content={generatedContent} defaultTab={outputTabByContentType[contentType]} />}</div></div>
}

function GenerationError({ message }: { message: string }) {
  return <Card className="border-destructive/30"><CardHeader><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"><AlertCircle className="size-5" /></span><div><CardTitle>Generation unavailable</CardTitle><CardDescription className="mt-1">{message}</CardDescription></div></div></CardHeader></Card>
}
