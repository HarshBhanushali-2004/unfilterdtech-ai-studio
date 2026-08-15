import { randomUUID } from "crypto"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { generateCarouselPlan } from "@/lib/ai/carousel-planner"
import { carouselPlanObjectSchema, type CarouselPlanObject } from "@/lib/ai/carousel-planner-schemas"

import { hashPlanKey } from "./plan-key"
import type { CarouselPlanInput } from "./types"

export type CarouselPlanResult = {
  id: string
  data: CarouselPlanObject
  /** Whether this result came from the cache (no Gemini carousel planning call made). */
  cached: boolean
}

export type GetOrCreateCarouselPlanOptions = {
  /**
   * Skips the cache lookup and always calls Gemini, persisting under a
   * fresh, randomized key rather than the deterministic plan key — matches
   * `getOrCreateVisualPrompt`'s `forceRegenerate` reasoning exactly
   * (CarouselPlan rows are a cross-creation cache; the Review page's
   * Regenerate action must never mutate what another Creation sharing the
   * same Planner+Brand Kit combination is showing).
   */
  forceRegenerate?: boolean
}

/**
 * The Carousel Planner's single entry point — Phase 1's AI Carousel Engine
 * (see AGENTS.md). Returns a cached plan when the (Planner, Brand Kit)
 * combination has been seen before; otherwise synthesizes one via Gemini and
 * persists it. Independent of the Visual Prompt Engine and the Instagram
 * Content Generator — for CAROUSEL creations, this plan (plus the media it
 * resolves to, see `lib/media-resolver/`) is the source of truth, not
 * `VisualPromptObject.carousel` or the legacy `GeneratedInstagramContent.carousel`.
 */
export async function getOrCreateCarouselPlan(
  { topic, plannerId, planner, research, brandKitId, brandContext }: CarouselPlanInput,
  options: GetOrCreateCarouselPlanOptions = {}
): Promise<CarouselPlanResult> {
  const planKey = options.forceRegenerate ? `regen:${randomUUID()}` : hashPlanKey({ plannerId, brandKitId })

  if (!options.forceRegenerate) {
    const existing = await prisma.carouselPlan.findUnique({ where: { planKey } })

    if (existing) {
      const parsed = carouselPlanObjectSchema.safeParse(existing.data)
      if (parsed.success) {
        return { id: existing.id, data: parsed.data, cached: true }
      }
      // A stored record that no longer matches the current schema falls
      // through and gets regenerated below.
    }
  }

  const data = await generateCarouselPlan(topic, research, planner, brandContext)

  const saved = await prisma.carouselPlan.upsert({
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

/** Looks up a previously generated carousel plan by id, e.g. to reuse it for a fresh generation. */
export async function getCarouselPlanById(id: string): Promise<CarouselPlanResult | null> {
  const record = await prisma.carouselPlan.findUnique({ where: { id } })
  if (!record) return null

  const parsed = carouselPlanObjectSchema.safeParse(record.data)
  if (!parsed.success) return null

  return { id: record.id, data: parsed.data, cached: true }
}
