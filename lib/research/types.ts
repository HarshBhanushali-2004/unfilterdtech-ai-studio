export type ResearchInput = {
  topic: string
}

/**
 * Extension point for future context providers — Google Search, News APIs,
 * Wikipedia, Perplexity, Arxiv, YouTube, RSS, PDF uploads, etc. Each source
 * returns plain-text context (or null if it has nothing relevant); the
 * Research Engine appends whatever comes back to the synthesis prompt before
 * calling Gemini. Adding a source means implementing this interface and
 * registering it in `lib/research/service.ts` — no changes needed anywhere
 * else in the pipeline (Prompt Builder, generation route, cache, UI).
 */
export interface ResearchSource {
  id: string
  fetchContext(input: ResearchInput): Promise<string | null>
}
