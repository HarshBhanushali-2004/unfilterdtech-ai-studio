"use client"

import { FileText, Link2, Lightbulb } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { SourceOption, SourceType } from "./types"

const sourceOptions: SourceOption[] = [
  { value: "topic", label: "Topic", description: "Start with a focused idea", icon: Lightbulb },
  { value: "text", label: "Text", description: "Shape existing notes", icon: FileText },
  { value: "url", label: "URL", description: "Build from a reference", icon: Link2 },
]

type SourceSelectorProps = {
  sourceType: SourceType
  values: Record<SourceType, string>
  onSourceTypeChange: (sourceType: SourceType) => void
  onValueChange: (sourceType: SourceType, value: string) => void
}

export function SourceSelector({ sourceType, values, onSourceTypeChange, onValueChange }: SourceSelectorProps) {
  const currentValue = values[sourceType]

  return (
    <section aria-labelledby="source-heading">
      <div className="mb-3"><h2 id="source-heading" className="text-sm font-semibold">Source material</h2><p className="mt-1 text-sm text-muted-foreground">Choose what you want AI to work from.</p></div>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Source type">
        {sourceOptions.map(({ icon: Icon, ...option }) => <button key={option.value} type="button" role="radio" aria-checked={sourceType === option.value} onClick={() => onSourceTypeChange(option.value)} className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", sourceType === option.value && "border-violet-500 bg-violet-500/8 ring-1 ring-violet-500/30")}><span className={cn("grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground", sourceType === option.value && "bg-violet-600 text-white")}><Icon className="size-4" /></span><span><span className="block text-sm font-medium">{option.label}</span><span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{option.description}</span></span></button>)}
      </div>
      <div className="mt-4">
        {sourceType === "topic" && <><Label htmlFor="topic">What do you want to talk about?</Label><Input id="topic" value={currentValue} onChange={(event) => onValueChange("topic", event.target.value)} className="mt-2 h-10" placeholder="e.g. Sustainable habits for busy professionals" /></>}
        {sourceType === "text" && <><Label htmlFor="source-text">Paste your notes or draft</Label><Textarea id="source-text" value={currentValue} onChange={(event) => onValueChange("text", event.target.value)} className="mt-2 min-h-28 resize-y" placeholder="Share the key points, a rough draft, or the message you want to develop." /></>}
        {sourceType === "url" && <><Label htmlFor="source-url">Reference URL</Label><Input id="source-url" type="url" value={currentValue} onChange={(event) => onValueChange("url", event.target.value)} className="mt-2 h-10" placeholder="https://example.com/article" /></>}
      </div>
    </section>
  )
}
