import { createHash } from "crypto"

export type PlanKeyInput = {
  plannerId: string
  brandKitId: string | null
}

/** Cache key for `PostPlan.planKey` — mirrors `lib/carousel-plan/plan-key.ts` exactly. */
export function hashPlanKey({ plannerId, brandKitId }: PlanKeyInput): string {
  const raw = [plannerId, brandKitId ?? "none"].join("|")
  return createHash("sha256").update(raw).digest("hex")
}
