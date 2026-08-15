import { randomUUID } from "crypto"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { generateReelPlan } from "@/lib/ai/reel-planner"
import { reelPlanObjectSchema, type ReelPlanObject } from "@/lib/ai/reel-planner-schemas"

import { hashPlanKey } from "./plan-key"
import type { ReelPlanInput } from "./types"

export type ReelPlanResult = {
  id: string
  data: ReelPlanObject
  cached: boolean
}

export type GetOrCreateReelPlanOptions = {
  forceRegenerate?: boolean
}

/**
 * The Reel Planner's single entry point — Phase 1C's Instagram Reel content
 * type (see AGENTS.md). Mirrors `getOrCreateCarouselPlan` exactly.
 */
export async function getOrCreateReelPlan(
  { topic, plannerId, planner, research, brandKitId, brandContext }: ReelPlanInput,
  options: GetOrCreateReelPlanOptions = {}
): Promise<ReelPlanResult> {
  const planKey = options.forceRegenerate ? `regen:${randomUUID()}` : hashPlanKey({ plannerId, brandKitId })

  if (!options.forceRegenerate) {
    const existing = await prisma.reelPlan.findUnique({ where: { planKey } })

    if (existing) {
      const parsed = reelPlanObjectSchema.safeParse(existing.data)
      if (parsed.success) {
        return { id: existing.id, data: parsed.data, cached: true }
      }
    }
  }

  const data = await generateReelPlan(topic, research, planner, brandContext)

  const saved = await prisma.reelPlan.upsert({
    where: { planKey },
    create: {
      planKey,
      plannerId,
      brandKitId,
      data: data as unknown as Prisma.InputJsonValue,
      model: "Gemini",
    },
    update: {
      data: data as unknown as Prisma.InputJsonValue,
    },
  })

  return { id: saved.id, data, cached: false }
}

export async function getReelPlanById(id: string): Promise<ReelPlanResult | null> {
  const record = await prisma.reelPlan.findUnique({ where: { id } })
  if (!record) return null

  const parsed = reelPlanObjectSchema.safeParse(record.data)
  if (!parsed.success) return null

  return { id: record.id, data: parsed.data, cached: true }
}
