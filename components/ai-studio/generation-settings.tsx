"use client"

import { Sparkles } from "lucide-react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const creativityLabels = ["Focused", "Balanced", "Expressive"]

type GenerationSettingsProps = {
  tone: string
  creativity: number
  onToneChange: (tone: string) => void
  onCreativityChange: (creativity: number) => void
}

export function GenerationSettings({
  tone,
  creativity,
  onToneChange,
  onCreativityChange,
}: GenerationSettingsProps) {
  const creativityLabel =
    creativity < 35
      ? creativityLabels[0]
      : creativity > 70
        ? creativityLabels[2]
        : creativityLabels[1]

  return (
    <section
      aria-labelledby="settings-heading"
      className="rounded-xl bg-muted/55 p-4"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
          <Sparkles className="size-3.5" />
        </span>

        <div>
          <h2 id="settings-heading" className="text-sm font-semibold">
            Generation settings
          </h2>

          <p className="text-xs text-muted-foreground">
            Fine-tune the creative direction.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">

        {/* Tone */}
        <div>
          <Label htmlFor="tone">
            Tone
          </Label>

          <Select
            value={tone}
            onValueChange={onToneChange}
          >
            <SelectTrigger
              id="tone"
              className="mt-2 w-full bg-background"
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent>

              <SelectItem value="professional">
                Professional
              </SelectItem>

              <SelectItem value="confident">
                Confident & clear
              </SelectItem>

              <SelectItem value="friendly">
                Warm & friendly
              </SelectItem>

              <SelectItem value="playful">
                Playful & energetic
              </SelectItem>

              <SelectItem value="thoughtful">
                Thoughtful & insightful
              </SelectItem>

            </SelectContent>
          </Select>
        </div>


        {/* Creativity */}
        <div>

          <div className="flex items-center justify-between">
            <Label htmlFor="creativity">
              Creativity
            </Label>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                {creativity}%
              </span>

              <span className="text-xs text-muted-foreground">
                ({creativityLabel})
              </span>
            </div>

          </div>


          <input
            id="creativity"
            type="range"
            min="0"
            max="100"
            step="1"
            value={creativity}
            onChange={(event) =>
              onCreativityChange(Number(event.target.value))
            }
            className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-valuetext={`${creativityLabel}, ${creativity} out of 100`}
          />


          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>
              Focused
            </span>

            <span>
              Expressive
            </span>
          </div>

        </div>

      </div>

    </section>
  )
}