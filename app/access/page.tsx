"use client"

import { useState, type FormEvent } from "react"
import { Bot, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function AccessPage() {
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || !password) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(
          response.status === 401
            ? "Incorrect password. Please try again."
            : body?.error ?? "Something went wrong. Please try again."
        )
        setIsSubmitting(false)
        return
      }

      // Full navigation so the proxy re-evaluates the freshly-set cookie.
      window.location.href = "/"
    } catch {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
            <Bot className="size-5" />
          </span>
          <div className="leading-tight">
            <span className="block font-semibold tracking-tight">unfilterd</span>
            <span className="block text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              AI Studio
            </span>
          </div>
        </div>

        <Card className="ring-foreground/10">
          <CardContent className="flex flex-col items-center gap-1.5 pt-2 pb-4 text-center">
            <span className="grid size-9 place-items-center rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Lock className="size-4" />
            </span>
            <h1 className="mt-1 text-base font-semibold tracking-tight">
              Private Beta
            </h1>
            <p className="text-sm text-muted-foreground">
              This application is currently available only to invited testers.
            </p>
          </CardContent>

          <CardContent className="border-t pt-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="access-password">Password</Label>
                <Input
                  id="access-password"
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) setError(null)
                  }}
                  aria-invalid={error ? true : undefined}
                  disabled={isSubmitting}
                />
                {error && (
                  <p className="text-xs text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !password}
                className={cn(
                  "mt-1 w-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white hover:brightness-110"
                )}
              >
                {isSubmitting ? "Verifying..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
