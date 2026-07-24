"use client"

import { Check, Copy, MessageSquareText } from "lucide-react"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { OutputTab } from "./types"

type OutputPanelProps = { subject: string; defaultTab: OutputTab; generated: boolean }

export function OutputPanel({ subject, defaultTab, generated }: OutputPanelProps) {
  const [activeTab, setActiveTab] = React.useState<OutputTab>(defaultTab)
  const [copied, setCopied] = React.useState(false)
  const title = subject || "your next idea"
  const caption = `Small shifts create lasting momentum. ${title} is a reminder that progress does not need to be perfect to be meaningful. Start with one choice that feels possible today, then give it room to grow.\n\nWhat is one small shift you are ready to make?\n\n#CreativeRoutine #IntentionalGrowth #BuildInPublic`
  const copyCaption = async () => { await navigator.clipboard?.writeText(caption); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  return <Card className="min-h-130"><CardHeader className="border-b"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><CardTitle>Generated content</CardTitle>{generated && <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">Ready</Badge>}</div><CardDescription className="mt-1">{generated ? "Review, refine, and adapt your draft for each format." : "Your tailored draft will appear here after generation."}</CardDescription></div>{generated && <Button variant="outline" size="sm" onClick={copyCaption}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy caption"}</Button>}</div></CardHeader><CardContent className="pt-5">{generated ? <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OutputTab)}><TabsList className="mb-5 w-full justify-start overflow-x-auto bg-muted/60"><TabsTrigger value="caption">Caption</TabsTrigger><TabsTrigger value="carousel">Carousel</TabsTrigger><TabsTrigger value="story">Story</TabsTrigger><TabsTrigger value="reel">Reel</TabsTrigger></TabsList><TabsContent value="caption" className="mt-0"><p className="whitespace-pre-line text-sm leading-7">{caption}</p></TabsContent><TabsContent value="carousel" className="mt-0"><OutputList items={[`Slide 1 · ${title}`, "Slide 2 · Why this matters right now", "Slide 3 · A simple way to get started", "Slide 4 · Keep the momentum going", "Slide 5 · A question to invite conversation"]} /></TabsContent><TabsContent value="story" className="mt-0"><OutputList items={["Frame 1 · Start with a relatable question", "Frame 2 · Share one clear insight", "Frame 3 · Add a quick audience poll", "Frame 4 · Close with a save-worthy takeaway"]} /></TabsContent><TabsContent value="reel" className="mt-0"><OutputList items={["Hook · You do not need a perfect plan to begin.", "Scene 1 · Show the friction your audience knows", "Scene 2 · Reveal the small shift that changes it", "Close · Invite viewers to share their next step"]} /></TabsContent></Tabs> : <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/25 px-6 text-center"><span className="grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300"><MessageSquareText className="size-5" /></span><h3 className="mt-4 text-sm font-semibold">Ready when you are</h3><p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">Choose a source and format, then generate a content draft tailored to your direction.</p></div>}</CardContent></Card>
}

function OutputList({ items }: { items: string[] }) { return <ol className="space-y-3">{items.map((item, index) => <li key={item} className="flex gap-3 rounded-lg bg-muted/55 p-3 text-sm leading-6"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-300">{index + 1}</span><span>{item}</span></li>)}</ol> }
