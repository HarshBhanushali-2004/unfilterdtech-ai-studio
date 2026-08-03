import { createHash } from "crypto"

/**
 * Collapses incidental whitespace/casing differences so trivially different
 * inputs ("iPhone 18 Fold", "  iphone 18 fold ") share the same cache entry.
 */
export function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Fixed-length cache key for the `Research.topicKey` unique index. Topics can
 * be up to 12,000 characters (the same source text used for generation), far
 * beyond what's safe to index directly in Postgres — hashing keeps the index
 * small regardless of input length while still deduplicating identical topics.
 */
export function hashTopic(topic: string): string {
  return createHash("sha256").update(normalizeTopic(topic)).digest("hex")
}
