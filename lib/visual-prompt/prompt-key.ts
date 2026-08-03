import { createHash } from "crypto"

export type PromptKeyInput = {
  plannerId: string
  brandKitId: string | null
}

/**
 * Cache key for `VisualPrompt.promptKey`. The Planner already encodes
 * Research + tone + creativity, so the Visual Prompt Engine only needs to
 * key on the Planner it was derived from plus Brand Kit (colors/style
 * directly shape the image prompts) — an identical combination reuses the
 * same visual prompts, per the Visual Prompt Cache spec.
 */
export function hashPromptKey({ plannerId, brandKitId }: PromptKeyInput): string {
  const raw = [plannerId, brandKitId ?? "none"].join("|")
  return createHash("sha256").update(raw).digest("hex")
}
