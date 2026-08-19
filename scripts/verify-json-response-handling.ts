/**
 * Local, zero-network, zero-quota verification for the "Generation
 * unavailable / Unexpected token 'A', "An error o"... is not valid JSON"
 * fix (see ABOUT.md). Exercises the actual `parseJsonResponse` helper
 * (`lib/http/parse-json-response.ts`) against real `Response` objects built
 * from the exact scenarios that were actually observed/reasoned about —
 * including the literal "An error occurred with your deployment"-shaped
 * platform text a killed serverless function returns — using only the
 * standard `Response`/`Headers` globals (no mocking library, no test
 * framework, matching this repo's existing `scripts/verify-*.ts`
 * convention). Also exercises `generatedInstagramContentSchema` directly
 * against malformed model output, since that's the other half of "does a
 * bad response get turned into a controlled error" — Zod validation, not
 * network parsing.
 *
 * Run: node --experimental-transform-types --loader ./scripts/ts-relative-ext-loader.mjs scripts/verify-json-response-handling.ts
 */

import assert from "node:assert/strict"

import { parseJsonResponse } from "../lib/http/parse-json-response"
import { generatedInstagramContentSchema } from "../lib/ai/schemas"

let passed = 0

function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++
      console.log(`✓ ${name}`)
    })
    .catch((error) => {
      console.error(`✗ ${name}`)
      throw error
    })
}

async function main() {
  // A. A successful, well-formed API JSON response parses correctly.
  await check("valid JSON success body parses", async () => {
    const response = new Response(JSON.stringify({ data: { caption: "hello" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
    const result = await parseJsonResponse<{ data: { caption: string } }>(response)
    assert.equal(result.ok, true)
    assert.ok(result.ok && result.data.data.caption === "hello")
  })

  // C. A JSON *error* response (still valid JSON, just `response.ok === false`
  // and an `{ error }` shape) is read correctly — the caller's own
  // `if (!response.ok || !payload.data)` check is what turns this into a
  // thrown Error, matching every route handler's existing `{ error }` contract.
  await check("valid JSON error body parses (caller decides it's an error)", async () => {
    const response = new Response(JSON.stringify({ error: "Unable to generate content right now." }), {
      status: 502,
      headers: { "content-type": "application/json" },
    })
    const result = await parseJsonResponse<{ error?: string }>(response)
    assert.equal(result.ok, true)
    assert.ok(result.ok && result.data.error === "Unable to generate content right now.")
    assert.equal(response.ok, false)
  })

  // D. The actual reported incident: a non-JSON platform error page (the
  // literal shape a killed Vercel serverless function returns) must NOT
  // throw a raw "Unexpected token ... is not valid JSON" — it must resolve
  // to a controlled, friendly result instead.
  await check("non-JSON platform error page (the reported bug) is handled without throwing", async () => {
    const response = new Response("An error occurred with your deployment\n\nFUNCTION_INVOCATION_TIMEOUT", {
      status: 504,
      headers: { "content-type": "text/plain" },
    })
    const result = await parseJsonResponse(response)
    assert.equal(result.ok, false)
    assert.ok(!result.ok && !/Unexpected token/i.test(result.message))
    assert.ok(!result.ok && /timed out/i.test(result.message))
  })

  // D (variant). An HTML error page (a different but equally real
  // "something upstream of our route handler answered instead" case).
  await check("non-JSON HTML error page is handled without throwing", async () => {
    const response = new Response("<!DOCTYPE html><html><body>Internal Server Error</body></html>", {
      status: 500,
      headers: { "content-type": "text/html" },
    })
    const result = await parseJsonResponse(response)
    assert.equal(result.ok, false)
    assert.ok(!result.ok && !/Unexpected token/i.test(result.message))
  })

  // A response claiming `application/json` but whose body is actually
  // truncated/corrupt (e.g. a connection cut mid-stream) must also resolve
  // cleanly, not throw — this is the `response.json()` SyntaxError path
  // inside the try/catch, not the Content-Type short-circuit.
  await check("declared-JSON but malformed body is handled without throwing", async () => {
    const response = new Response('{"data": {"caption": "unterminated', {
      status: 200,
      headers: { "content-type": "application/json" },
    })
    const result = await parseJsonResponse(response)
    assert.equal(result.ok, false)
  })

  // B. Malformed/incomplete model output must fail Zod validation in a
  // controlled way (this is the /api/generate route's own
  // `generatedInstagramContentSchema.safeParse` guard — CLAUDE.md's "the
  // only safety net preventing a malformed Gemini response from being
  // persisted... or shown to the user as if it were structurally valid").
  await check("malformed planner/content output fails Zod validation in a controlled way", () => {
    const malformed = { caption: "missing every other required field" }
    const result = generatedInstagramContentSchema.safeParse(malformed)
    assert.equal(result.success, false)
  })

  await check("well-formed content output passes Zod validation", () => {
    const wellFormed = {
      caption: "A caption",
      hashtags: ["one", "two"],
      carousel: [{ slideNumber: 1, headline: "H", body: "B", visualSuggestion: "V" }],
      story: [{ frameNumber: 1, text: "T", visualSuggestion: "V" }],
      reel: { hook: "H", script: "S", scenes: [{ sceneNumber: 1, visual: "V", narration: "N" }] },
    }
    const result = generatedInstagramContentSchema.safeParse(wellFormed)
    assert.equal(result.success, true)
  })

  console.log(`\n${passed} check(s) passed.`)
}

main().catch((error) => {
  console.error("\nVerification failed:", error)
  process.exitCode = 1
})
