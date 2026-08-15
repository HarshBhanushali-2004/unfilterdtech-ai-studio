import { createHash } from "crypto"

export type PlanKeyInput = {
  plannerId: string
  brandKitId: string | null
}

/**
 * Cache key for `CarouselPlan.planKey`. Mirrors
 * `lib/visual-prompt/prompt-key.ts`'s reasoning exactly: the Planner already
 * encodes Research + tone + creativity, so the Carousel Planner only needs
 * to key on the Planner it was derived from plus Brand Kit (voice/CTA style
 * directly shape slide copy) — an identical combination reuses the same
 * carousel plan instead of re-calling Gemini.
 */
export function hashPlanKey({ plannerId, brandKitId }: PlanKeyInput): string {
  const raw = [plannerId, brandKitId ?? "none"].join("|")
  return createHash("sha256").update(raw).digest("hex")
}
