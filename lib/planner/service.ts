import { randomUUID } from "crypto"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { generatePlanner } from "@/lib/ai/planner"
import { plannerObjectSchema, type PlannerObject } from "@/lib/ai/planner-schemas"
import type { ResearchObject } from "@/lib/ai/research-schemas"

import { hashPlanKey } from "./plan-key"

export type PlannerResult = {
  id: string
  data: PlannerObject
  /** Whether this result came from the cache (no Gemini planner call made). */
  cached: boolean
}

export type GetOrCreatePlannerInput = {
  researchId: string
  research: ResearchObject
  brandKitId: string | null
  brandContext: string
  tone: string
  creativity: number
}

export type GetOrCreatePlannerOptions = {
  /**
   * Skips the cache lookup and always calls Gemini, persisting under a
   * fresh, randomized key rather than the deterministic plan key — see the
   * matching option on `getOrCreateResearch` for why (Planner rows are a
   * cross-creation cache; regenerating one Creation must never mutate what
   * another Creation sharing the same inputs sees).
   */
  forceRegenerate?: boolean
}

/**
 * The AI Planner's single entry point — the second intelligence step, after
 * Research and before generation. Returns a cached strategic plan when the
 * (Research, Brand Kit, tone, creativity) combination has been seen before;
 * otherwise synthesizes one via Gemini and persists it.
 */
export async function getOrCreatePlanner(
  { researchId, research, brandKitId, brandContext, tone, creativity }: GetOrCreatePlannerInput,
  options: GetOrCreatePlannerOptions = {}
): Promise<PlannerResult> {
  const planKey = options.forceRegenerate
    ? `regen:${randomUUID()}`
    : hashPlanKey({ researchId, brandKitId, tone, creativity })

  if (!options.forceRegenerate) {
    const existing = await prisma.planner.findUnique({ where: { planKey } })

    if (existing) {
      const parsed = plannerObjectSchema.safeParse(existing.data)
      if (parsed.success) {
        return { id: existing.id, data: parsed.data, cached: true }
      }
      // A stored record that no longer matches the current schema falls
      // through and gets regenerated below.
    }
  }

  const data = await generatePlanner(research, brandContext, tone, creativity)

  const saved = await prisma.planner.upsert({
    where: { planKey },
    create: {
      planKey,
      researchId,
      brandKitId,
      tone,
      creativity,
      data: data as unknown as Prisma.InputJsonValue,
      model: "Gemini",
    },
    update: {
      data: data as unknown as Prisma.InputJsonValue,
    },
  })

  return { id: saved.id, data, cached: false }
}

/** Looks up a previously generated strategic plan by id, e.g. to reuse it for a fresh generation. */
export async function getPlannerById(id: string): Promise<PlannerResult | null> {
  const record = await prisma.planner.findUnique({ where: { id } })
  if (!record) return null

  const parsed = plannerObjectSchema.safeParse(record.data)
  if (!parsed.success) return null

  return { id: record.id, data: parsed.data, cached: true }
}
