/**
 * Shared by every format's media generation orchestration (carousel/post/
 * story/reel — Phase 1C, AGENTS.md Core Requirement #7: "Do not blindly
 * fire every media request simultaneously... Use a bounded queue/
 * concurrency mechanism"). Runs `worker` over every item with at most
 * `limit` calls in flight at once, preserving each item's result at its
 * original index regardless of completion order. Deliberately a plain
 * hand-rolled limiter (~15 lines), not a new dependency.
 */
export async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function runNext(): Promise<void> {
    const index = nextIndex++
    if (index >= items.length) return

    results[index] = await worker(items[index], index)
    await runNext()
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext))

  return results
}

/**
 * How many items' media may resolve (i.e. call the image provider) at once
 * — shared across every format. A real end-to-end Phase 1B test against the
 * FLUX/Together provider (see `lib/ai/image-providers/flux-provider.ts`)
 * showed that firing every item's image request simultaneously reliably
 * tripped that provider's burst rate limit, failing most items at once — a
 * real constraint of a free-tier image provider under multi-item parallel
 * load, not something per-item retry/error-isolation can fix by itself.
 */
export const MAX_CONCURRENT_MEDIA_REQUESTS = 2
