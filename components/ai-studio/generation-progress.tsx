import { CheckCircle2, LoaderCircle, Sparkles } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const steps = ["Understanding your source", "Finding a strong creative angle", "Writing platform-ready content"]

export function GenerationProgress({ progress }: { progress: number }) {
  const activeStep = Math.min(Math.floor(progress / 34), steps.length - 1)
  return <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-indigo-500/10"><CardHeader><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white"><LoaderCircle className="size-5 animate-spin" /></span><div><CardTitle>Creating your content</CardTitle><CardDescription className="mt-1">AI is turning your direction into an on-brand draft.</CardDescription></div></div></CardHeader><CardContent><Progress value={progress} className="h-2" /><div className="mt-5 space-y-3">{steps.map((step, index) => <div key={step} className="flex items-center gap-3 text-sm"><span className={index <= activeStep ? "text-violet-600 dark:text-violet-300" : "text-muted-foreground"}>{index < activeStep ? <CheckCircle2 className="size-4" /> : index === activeStep ? <Sparkles className="size-4" /> : <span className="block size-4 rounded-full border" />}</span><span className={index <= activeStep ? "font-medium" : "text-muted-foreground"}>{step}</span></div>)}</div></CardContent></Card>
}
