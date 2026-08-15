import { randomUUID } from "crypto"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { generatePostPlan } from "@/lib/ai/post-planner"
import { postPlanObjectSchema, type PostPlanObject } from "@/lib/ai/post-planner-schemas"

import { hashPlanKey } from "./plan-key"
import type { PostPlanInput } from "./types"

export type PostPlanResult = {
  id: string
  data: PostPlanObject
  cached: boolean
}

export type GetOrCreatePostPlanOptions = {
  /** Skips the cache lookup and always calls Gemini — see `getOrCreateCarouselPlan`'s matching option for why (cross-creation cache; Regenerate must never mutate another Creation sharing the same Planner+Brand Kit). */
  forceRegenerate?: boolean
}

/**
 * The Post Planner's single entry point — Phase 1C's Instagram Single Post
 * content type (see AGENTS.md). Mirrors `getOrCreateCarouselPlan` exactly.
 */
export async function getOrCreatePostPlan(
  { topic, plannerId, planner, research, brandKitId, brandContext }: PostPlanInput,
  options: GetOrCreatePostPlanOptions = {}
): Promise<PostPlanResult> {
  const planKey = options.forceRegenerate ? `regen:${randomUUID()}` : hashPlanKey({ plannerId, brandKitId })

  if (!options.forceRegenerate) {
    const existing = await prisma.postPlan.findUnique({ where: { planKey } })

    if (existing) {
      const parsed = postPlanObjectSchema.safeParse(existing.data)
      if (parsed.success) {
        return { id: existing.id, data: parsed.data, cached: true }
      }
    }
  }

  const data = await generatePostPlan(topic, research, planner, brandContext)

  const saved = await prisma.postPlan.upsert({
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

export async function getPostPlanById(id: string): Promise<PostPlanResult | null> {
  const record = await prisma.postPlan.findUnique({ where: { id } })
  if (!record) return null

  const parsed = postPlanObjectSchema.safeParse(record.data)
  if (!parsed.success) return null

  return { id: record.id, data: parsed.data, cached: true }
}
