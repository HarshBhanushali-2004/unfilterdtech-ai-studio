import { randomUUID } from "crypto"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { generateResearch } from "@/lib/ai/research"
import { researchObjectSchema, type ResearchObject } from "@/lib/ai/research-schemas"

import { hashTopic, normalizeTopic } from "./topic-key"
import type { ResearchSource } from "./types"

// Registered context sources for the Research Engine. Empty today — see
// `ResearchSource` in `./types` for how to plug one in later (Google Search,
// Wikipedia, News APIs, Perplexity, Arxiv, YouTube, RSS, PDF uploads, ...).
const sources: ResearchSource[] = []

export type ResearchResult = {
  id: string
  data: ResearchObject
  /** Whether this result came from the cache (no Gemini research call made). */
  cached: boolean
}

async function collectSourceContext(topic: string): Promise<string[]> {
  if (sources.length === 0) return []

  const results = await Promise.all(
    sources.map((source) => source.fetchContext({ topic }).catch(() => null))
  )

  return results.filter((value): value is string => Boolean(value))
}

export type GetOrCreateResearchOptions = {
  /**
   * Skips the cache lookup entirely and always calls Gemini, persisting the
   * result under a fresh, randomized key instead of the deterministic
   * topic hash. Used by the Creation "Regenerate" action — reusing the
   * canonical cached row (or overwriting it in place) would either return
   * byte-identical content or silently change what every *other* creation
   * sharing this topic sees, since Research rows are a cross-creation
   * cache, not owned by any single Creation.
   */
  forceRegenerate?: boolean
}

/**
 * The Research Engine's single entry point, and the first step of every
 * content generation. Returns cached structured research for a topic when
 * one already exists; otherwise synthesizes it via Gemini and persists it.
 *
 * Deliberately takes only a topic — no Brand Kit, tone, or content type.
 * Research is factual and reusable across every brand and every format.
 */
export async function getOrCreateResearch(
  topic: string,
  options: GetOrCreateResearchOptions = {}
): Promise<ResearchResult> {
  const topicKey = options.forceRegenerate ? `regen:${randomUUID()}` : hashTopic(topic)

  if (!options.forceRegenerate) {
    const existing = await prisma.research.findUnique({ where: { topicKey } })

    if (existing) {
      const parsed = researchObjectSchema.safeParse(existing.data)
      if (parsed.success) {
        return { id: existing.id, data: parsed.data, cached: true }
      }
      // A stored record that no longer matches the current schema (e.g. it
      // predates a newly added field) falls through and gets regenerated below.
    }
  }

  const context = await collectSourceContext(topic)
  const data = await generateResearch(topic, context)

  const saved = await prisma.research.upsert({
    where: { topicKey },
    create: {
      topicKey,
      topic: normalizeTopic(topic),
      data: data as unknown as Prisma.InputJsonValue,
      model: "Gemini",
    },
    update: {
      topic: normalizeTopic(topic),
      data: data as unknown as Prisma.InputJsonValue,
      model: "Gemini",
    },
  })

  return { id: saved.id, data, cached: false }
}

/** Looks up a previously generated research brief by id, e.g. to reuse it for a fresh generation. */
export async function getResearchById(id: string): Promise<ResearchResult | null> {
  const record = await prisma.research.findUnique({ where: { id } })
  if (!record) return null

  const parsed = researchObjectSchema.safeParse(record.data)
  if (!parsed.success) return null

  return { id: record.id, data: parsed.data, cached: true }
}
