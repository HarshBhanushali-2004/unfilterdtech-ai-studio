"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { ContentTypeSelector } from "@/components/ai-studio/content-type-selector"
import { GenerationProgress } from "@/components/ai-studio/generation-progress"
import { GenerationSettings } from "@/components/ai-studio/generation-settings"
import { OutputPanel } from "@/components/ai-studio/output-panel"
import { SourceSelector } from "@/components/ai-studio/source-selector"
import type { ContentType, OutputTab, SourceType } from "@/components/ai-studio/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const outputTabByContentType: Record<ContentType, OutputTab> = { post: "caption", carousel: "carousel", story: "story", reel: "reel" }

export function StudioWorkspace() {
  const [sourceType, setSourceType] = React.useState<SourceType>("topic")
  const [sourceValues, setSourceValues] = React.useState<Record<SourceType, string>>({ topic: "", text: "", url: "" })
  const [contentType, setContentType] = React.useState<ContentType>("post")
  const [tone, setTone] = React.useState("confident")
  const [creativity, setCreativity] = React.useState(55)
  const [progress, setProgress] = React.useState<number | null>(null)
  const [generated, setGenerated] = React.useState(false)

  React.useEffect(() => { if (progress === null) return; if (progress >= 100) { const finishTimer = window.setTimeout(() => { setProgress(null); setGenerated(true) }, 450); return () => window.clearTimeout(finishTimer) } const timer = window.setTimeout(() => setProgress((current) => current === null ? null : Math.min(current + 17, 100)), 420); return () => window.clearTimeout(timer) }, [progress])

  const sourceValue = sourceValues[sourceType]
  const generate = () => { if (!sourceValue.trim()) return; setGenerated(false); setProgress(8) }
  const handleSourceTypeChange = (nextSourceType: SourceType) => { setSourceType(nextSourceType); setGenerated(false) }
  const handleSourceValueChange = (type: SourceType, value: string) => { setSourceValues((current) => ({ ...current, [type]: value })); setGenerated(false) }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start"><Card><CardContent className="space-y-7 pt-6"><SourceSelector sourceType={sourceType} values={sourceValues} onSourceTypeChange={handleSourceTypeChange} onValueChange={handleSourceValueChange} /><ContentTypeSelector value={contentType} onChange={(value) => { setContentType(value); setGenerated(false) }} /><GenerationSettings tone={tone} creativity={creativity} onToneChange={setTone} onCreativityChange={setCreativity} /><Button className="w-full bg-violet-600 text-white hover:bg-violet-700" size="lg" disabled={!sourceValue.trim() || progress !== null} onClick={generate}>{progress !== null ? <><Sparkles className="animate-pulse" />Generating content…</> : <><Sparkles />Generate {contentType === "post" ? "Instagram post" : contentType}</>}</Button></CardContent></Card><div className="space-y-6">{progress !== null ? <GenerationProgress progress={progress} /> : <OutputPanel key={`${contentType}-${generated}`} subject={sourceValue.trim()} defaultTab={outputTabByContentType[contentType]} generated={generated} />}</div></div>
}
