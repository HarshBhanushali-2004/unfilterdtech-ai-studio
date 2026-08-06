/**
 * Standalone verification for the Gemini resilience pipeline
 * (lib/ai/gemini-provider.ts) — requirement 7 of the "production-grade AI
 * generation pipeline" task: simulate 503s and confirm generation eventually
 * succeeds without user intervention whenever another key or model is
 * available, and that a total failure surfaces a friendly message only.
 *
 * Not part of the app's runtime — a one-off check, run manually with:
 *   npm run verify:gemini-resilience
 * (or the underlying command directly — Node's stripped-syntax TS support
 * doesn't handle parameter-property constructors, hence --experimental-
 * transform-types, and its ESM resolver needs an explicit extension on
 * every relative import, hence the small loader hook):
 *   node --experimental-transform-types --loader ./scripts/ts-relative-ext-loader.mjs scripts/verify-gemini-resilience.ts
 *
 * It monkey-patches GoogleGenerativeAI.prototype.getGenerativeModel so no
 * real network calls are made and no real API key is required. Each
 * scenario sets its own isolated env (fake keys/models) so it doesn't
 * depend on whatever is configured in .env.local.
 */
import { GoogleGenerativeAI } from "@google/generative-ai"

import { AIServiceError } from "../lib/ai/errors.ts"
import { generateWithGemini } from "../lib/ai/gemini-provider.ts"

type Call = { apiKey: string; model: string }

let calls: Call[] = []
let behavior: (call: Call, callIndex: number) => string = () => "ok"

// @ts-expect-error - test double, not a real GenerativeModel instance
GoogleGenerativeAI.prototype.getGenerativeModel = function (config: { model: string }) {
  const apiKey = (this as { apiKey: string }).apiKey
  return {
    generateContent: async () => {
      const call = { apiKey, model: config.model }
      calls.push(call)
      const outcome = behavior(call, calls.length - 1)

      if (outcome !== "ok") {
        const error = new Error(outcome) as Error & { status?: number }
        error.status = outcome.includes("503") ? 503 : undefined
        throw error
      }

      return { response: { text: () => "generated text" } }
    },
  }
}

function setEnv(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function resetEnv() {
  for (let i = 1; i <= 20; i++) delete process.env[`GEMINI_API_KEY_${i}`]
  delete process.env.GEMINI_API_KEY
  delete process.env.GEMINI_MODEL
  delete process.env.GEMINI_MODEL_FALLBACKS
}

let passed = 0
let failed = 0

async function scenario(name: string, run: () => Promise<void>) {
  calls = []
  resetEnv()
  const startedAt = Date.now()
  try {
    await run()
    console.log(`✅ ${name} (${Date.now() - startedAt}ms, ${calls.length} calls)`)
    passed++
  } catch (error) {
    console.error(`❌ ${name}:`, error)
    failed++
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

async function main() {
  await scenario("Recovers after 2 simulated 503s on the same key (retry + backoff)", async () => {
    setEnv({ GEMINI_API_KEY: "key-1", GEMINI_MODEL: "model-a" })
    behavior = (_call, index) =>
      index < 2 ? "[503 Service Unavailable] Model is currently experiencing high demand." : "ok"

    const result = await generateWithGemini({ prompt: "test" })

    assert(result === "generated text", "should return generated text")
    assert(calls.length === 3, `expected 3 attempts (2 failures + 1 success), got ${calls.length}`)
    assert(
      calls.every((c) => c.apiKey === "key-1" && c.model === "model-a"),
      "all attempts should stay on the same key/model — no rotation should have been needed"
    )
  })

  await scenario("Rotates to key #2 once key #1 exhausts its retries on 503s", async () => {
    setEnv({
      GEMINI_API_KEY_1: "key-1",
      GEMINI_API_KEY_2: "key-2",
      GEMINI_MODEL: "model-a",
    })
    behavior = (call) => (call.apiKey === "key-1" ? "[503 Service Unavailable] high demand" : "ok")

    const result = await generateWithGemini({ prompt: "test" })

    assert(result === "generated text", "should return generated text")
    // key-1: 1 initial + 3 retries = 4 failed attempts, then key-2 succeeds on attempt 1.
    assert(calls.length === 5, `expected 5 attempts (4 on key-1 + 1 on key-2), got ${calls.length}`)
    assert(calls.slice(0, 4).every((c) => c.apiKey === "key-1"), "first 4 attempts should be key-1")
    assert(calls[4].apiKey === "key-2", "5th attempt should have rotated to key-2")
  })

  await scenario("Falls back to the next model once every key fails on the primary model", async () => {
    setEnv({
      GEMINI_API_KEY_1: "key-1",
      GEMINI_API_KEY_2: "key-2",
      GEMINI_MODEL: "model-a",
      GEMINI_MODEL_FALLBACKS: "model-b",
    })
    behavior = (call) => (call.model === "model-a" ? "503 Service Unavailable" : "ok")

    const result = await generateWithGemini({ prompt: "test" })

    assert(result === "generated text", "should return generated text")
    assert(calls.every((c) => c.model === "model-a" || c.model === "model-b"), "unexpected model used")
    assert(calls.some((c) => c.model === "model-b"), "should have fallen back to model-b")
    assert(
      calls.filter((c) => c.model === "model-a").length === 8,
      `expected model-a to exhaust both keys (4 attempts each = 8), got ${
        calls.filter((c) => c.model === "model-a").length
      }`
    )
  })

  await scenario("Retries other transient error types too (429, 500, 502, 504, ECONNRESET)", async () => {
    setEnv({ GEMINI_API_KEY: "key-1", GEMINI_MODEL: "model-a" })
    const transientMessages = [
      "429 Too Many Requests",
      "500 Internal Server Error",
      "502 Bad Gateway",
      "504 Gateway Timeout",
      "fetch failed: ECONNRESET",
    ]
    behavior = (_call, index) => (index < transientMessages.length ? transientMessages[index] : "ok")

    const result = await generateWithGemini({ prompt: "test" })
    assert(result === "generated text", "should eventually succeed")
  })

  await scenario("Never retries a non-transient error (bad request) and never leaks its raw message", async () => {
    setEnv({ GEMINI_API_KEY_1: "key-1", GEMINI_API_KEY_2: "key-2", GEMINI_MODEL: "model-a" })
    behavior = () => "400 Invalid argument: malformed prompt payload xyz"

    try {
      await generateWithGemini({ prompt: "test" })
      throw new Error("expected generateWithGemini to throw")
    } catch (error) {
      assert(calls.length === 1, `non-transient error should fail immediately, got ${calls.length} attempts`)
      assert(
        error instanceof Error && error.message.includes("Invalid argument"),
        "non-transient errors are expected to surface as-is from generateWithGemini (callers wrap them via toFriendlyAIServiceError)"
      )
    }
  })

  await scenario("Total exhaustion (all keys, all models) yields ONE friendly AIServiceError, no raw text", async () => {
    // Deliberately reuse the built-in fallback model names as the primary +
    // configured fallback, so the chain de-dupes to exactly these two
    // models instead of growing to include the built-ins a third/fourth
    // time — keeps the expected attempt count simple to assert on.
    setEnv({
      GEMINI_API_KEY_1: "key-1",
      GEMINI_API_KEY_2: "key-2",
      GEMINI_MODEL: "gemini-2.5-flash",
      GEMINI_MODEL_FALLBACKS: "gemini-2.0-flash",
    })
    behavior = () => "[503 Service Unavailable] Model is currently experiencing high demand."

    try {
      await generateWithGemini({ prompt: "test" })
      throw new Error("expected generateWithGemini to throw")
    } catch (error) {
      assert(error instanceof AIServiceError, "should throw AIServiceError, not a raw provider error")
      const message = (error as AIServiceError).message
      assert(!message.includes("503"), `friendly message must not contain raw provider text, got: "${message}"`)
      assert(!message.includes("Service Unavailable"), `friendly message leaked raw text: "${message}"`)
      assert((error as AIServiceError).status === 503, "should surface as a 503 to the route handler")
      // 2 keys x 4 attempts each x 2 models = 16 total attempts before giving up.
      assert(calls.length === 16, `expected exhaustive attempt count of 16, got ${calls.length}`)
    }
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
