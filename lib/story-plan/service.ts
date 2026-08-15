import { randomUUID } from "crypto"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { generateStoryPlan } from "@/lib/ai/story-planner"
import { storyPlanObjectSchema, type StoryPlanObject } from "@/lib/ai/story-planner-schemas"

import { hashPlanKey } from "./plan-key"
import type { StoryPlanInput } from "./types"

export type StoryPlanResult = {
  id: string
  data: StoryPlanObject
  cached: boolean
}

export type GetOrCreateStoryPlanOptions = {
  forceRegenerate?: boolean
}

/**
 * The Story Planner's single entry point — Phase 1C's Instagram Story
 * content type (see AGENTS.md). Mirrors `getOrCreateCarouselPlan` exactly.
 */
export async function getOrCreateStoryPlan(
  { topic, plannerId, planner, research, brandKitId, brandContext }: StoryPlanInput,
  options: GetOrCreateStoryPlanOptions = {}
): Promise<StoryPlanResult> {
  const planKey = options.forceRegenerate ? `regen:${randomUUID()}` : hashPlanKey({ plannerId, brandKitId })

  if (!options.forceRegenerate) {
    const existing = await prisma.storyPlan.findUnique({ where: { planKey } })

    if (existing) {
      const parsed = storyPlanObjectSchema.safeParse(existing.data)
      if (parsed.success) {
        return { id: existing.id, data: parsed.data, cached: true }
      }
    }
  }

  const data = await generateStoryPlan(topic, research, planner, brandContext)

  const saved = await prisma.storyPlan.upsert({
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

export async function getStoryPlanById(id: string): Promise<StoryPlanResult | null> {
  const record = await prisma.storyPlan.findUnique({ where: { id } })
  if (!record) return null

  const parsed = storyPlanObjectSchema.safeParse(record.data)
  if (!parsed.success) return null

  return { id: record.id, data: parsed.data, cached: true }
}
