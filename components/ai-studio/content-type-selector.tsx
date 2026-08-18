"use client"

import { GalleryVerticalEnd, ImageIcon, PanelsTopLeft, Video } from "lucide-react"

import { cn } from "@/lib/utils"

import type { ContentOption, ContentType } from "./types"

const contentOptions: ContentOption[] = [
  { value: "post", label: "Post", description: "Single visual post", icon: ImageIcon },
  { value: "carousel", label: "Carousel", description: "Multiple swipeable slides", icon: PanelsTopLeft },
  { value: "story", label: "Story", description: "Vertical story frames", icon: GalleryVerticalEnd },
  { value: "reel", label: "Reel", description: "Short-form video", icon: Video },
]

export function ContentTypeSelector({ value, onChange }: { value: ContentType; onChange: (value: ContentType) => void }) {
  return <section aria-labelledby="content-heading"><div className="mb-3"><h2 id="content-heading" className="text-sm font-semibold">Content type</h2><p className="mt-1 text-sm text-muted-foreground">Select the format you want to create.</p></div><div className="grid grid-cols-2 gap-2 xl:grid-cols-4" role="radiogroup" aria-label="Content type">{contentOptions.map(({ icon: Icon, ...option }) => <button key={option.value} type="button" role="radio" aria-checked={value === option.value} onClick={() => onChange(option.value)} className={cn("rounded-xl border p-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", value === option.value && "border-violet-500 bg-violet-500/8 ring-1 ring-violet-500/30")}><Icon className={cn("size-4 text-muted-foreground", value === option.value && "text-violet-600 dark:text-violet-300")} /><span className="mt-3 block text-sm font-medium">{option.label}</span><span className="mt-1 block text-xs leading-4 text-muted-foreground">{option.description}</span></button>)}</div></section>
}
