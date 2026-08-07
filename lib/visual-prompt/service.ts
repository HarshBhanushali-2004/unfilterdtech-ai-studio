import { randomUUID } from "crypto"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { generateVisualPrompt } from "@/lib/ai/visual-prompt"
import { visualPromptObjectSchema, type VisualPromptObject } from "@/lib/ai/visual-prompt-schemas"

import { hashPromptKey } from "./prompt-key"
import type { VisualPromptInput } from "./types"

export type VisualPromptResult = {
  id: string
  data: VisualPromptObject
  /** Whether this result came from the cache (no Gemini visual prompt call made). */
  cached: boolean
}

export type GetOrCreateVisualPromptOptions = {
  /**
   * Skips the cache lookup and always calls Gemini, persisting under a
   * fresh, randomized key rather than the deterministic prompt key — see
   * the matching option on `getOrCreateResearch` for why (VisualPrompt rows
   * are a cross-creation cache).
   */
  forceRegenerate?: boolean
}

/**
 * The Visual Prompt Engine's single entry point — the third intelligence
 * step, after Research and Planner and before generation. Returns cached
 * production-ready image prompts when the (Planner, Brand Kit) combination
 * has been seen before; otherwise synthesizes them via Gemini and persists
 * them. Independent of the Instagram Content Generator (Feature 5) — never
 * imported by `buildInstagramContentPrompt`.
 */
export async function getOrCreateVisualPrompt(
  { plannerId, planner, research, brandKitId, brandContext }: VisualPromptInput,
  options: GetOrCreateVisualPromptOptions = {}
): Promise<VisualPromptResult> {
  const promptKey = options.forceRegenerate ? `regen:${randomUUID()}` : hashPromptKey({ plannerId, brandKitId })

  if (!options.forceRegenerate) {
    const existing = await prisma.visualPrompt.findUnique({ where: { promptKey } })

    if (existing) {
      const parsed = visualPromptObjectSchema.safeParse(existing.data)
      if (parsed.success) {
        return { id: existing.id, data: parsed.data, cached: true }
      }
      // A stored record that no longer matches the current schema falls
      // through and gets regenerated below.
    }
  }

  const data = await generateVisualPrompt(research, planner, brandContext)

  const saved = await prisma.visualPrompt.upsert({
    where: { promptKey },
    create: {
      promptKey,
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

/** Looks up a previously generated visual prompt set by id, e.g. to reuse it for a fresh generation. */
export async function getVisualPromptById(id: string): Promise<VisualPromptResult | null> {
  const record = await prisma.visualPrompt.findUnique({ where: { id } })
  if (!record) return null

  const parsed = visualPromptObjectSchema.safeParse(record.data)
  if (!parsed.success) return null

  return { id: record.id, data: parsed.data, cached: true }
}
