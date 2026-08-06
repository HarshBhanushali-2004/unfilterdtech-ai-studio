"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const STAGES = [
  { label: "Generating your content...", afterMs: 0, progress: 20 },
  { label: "Retrying...", afterMs: 6_000, progress: 55 },
  { label: "Using backup AI model...", afterMs: 14_000, progress: 80 },
] as const

/**
 * Shown while a Studio generation request is in flight. The resilience
 * pipeline (lib/ai/gemini-provider.ts) retries transient failures, rotates
 * API keys, and falls back to a backup model entirely server-side within a
 * single request/response — this component has no visibility into which
 * stage is actually happening, so it cycles through friendly copy on a
 * timer instead of claiming precise state. The point is just: never leave
 * the user staring at a bare spinner (or, if generation ultimately fails,
 * a raw provider error) during a slow/retried request.
 */
export function GenerationProgress() {
  const [elapsedMs, setElapsedMs] = React.useState(0)

  React.useEffect(() => {
    const startedAt = Date.now()
    const interval = setInterval(() => setElapsedMs(Date.now() - startedAt), 500)
    return () => clearInterval(interval)
  }, [])

  const stage = [...STAGES].reverse().find((candidate) => elapsedMs >= candidate.afterMs) ?? STAGES[0]

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-indigo-500/10">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
            <LoaderCircle className="size-5 animate-spin" />
          </span>
          <div>
            <CardTitle>Creating your content</CardTitle>
            <CardDescription className="mt-1" aria-live="polite">
              {stage.label}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={stage.progress} className="h-2" />
      </CardContent>
    </Card>
  )
}
