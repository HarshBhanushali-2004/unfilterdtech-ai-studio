import { createHash } from "crypto"

export type PlanKeyInput = {
  researchId: string
  brandKitId: string | null
  tone: string
  creativity: number
}

/**
 * Cache key for `Planner.planKey`. Unlike Research (topic-only), the Planner
 * is brand- and tone-sensitive, so its cache key incorporates Research +
 * Brand Kit + tone + creativity — an identical combination reuses the same
 * plan, per the Planner Cache spec.
 */
export function hashPlanKey({ researchId, brandKitId, tone, creativity }: PlanKeyInput): string {
  const raw = [researchId, brandKitId ?? "none", tone.trim().toLowerCase(), String(creativity)].join("|")
  return createHash("sha256").update(raw).digest("hex")
}
