/**
 * Safely reads a `fetch` `Response` the caller expects to be JSON —
 * Phase 4's defensive contract from the "Generation unavailable / Unexpected
 * token 'A', "An error o"... is not valid JSON" incident (see ABOUT.md).
 *
 * Every Route Handler in this app returns `Response.json(...)`/
 * `NextResponse.json(...)` on both success and failure (CLAUDE.md Section
 * 20), so under normal operation `response.json()` never actually fails.
 * This exists for the case something *outside* our own route handler
 * produced the response instead — a serverless platform killing the
 * function for exceeding its execution time limit (the actual root cause
 * traced for the incident this was built for — see
 * `app/api/generate/route.ts`'s `maxDuration` comment), an upstream proxy/
 * CDN error page, or any other infrastructure-level failure that never
 * reached our code at all. Blindly calling `response.json()` on a body like
 * that throws a raw `SyntaxError` ("Unexpected token 'A', "An error o"...")
 * that means nothing to a user; this turns it into the same clean, useful
 * error shape every other failure in this app already produces.
 *
 * Never throws. Callers keep their existing "check `.ok`/`.data`, throw a
 * `new Error(payload.error)`" pattern unchanged — only `response.json()`
 * itself gets replaced with `await parseJsonResponse<T>(response)` and an
 * `if (!parsed.ok) throw new Error(parsed.message)` guard in front of it.
 */

export type JsonResponseResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; raw?: string }

function friendlyNonJsonMessage(status: number): string {
  if (status === 504) return "The request timed out. Please try again."
  if (status === 502 || status === 503) return "The server is temporarily unavailable. Please try again."
  if (status >= 500) return "The server had a problem handling this request. Please try again."
  if (status === 0) return "Unable to reach the server. Check your connection and try again."
  return "Something went wrong and the response couldn't be read. Please try again."
}

export async function parseJsonResponse<T = unknown>(response: Response): Promise<JsonResponseResult<T>> {
  const contentType = response.headers.get("content-type") ?? ""

  // A non-JSON Content-Type is enough on its own to know this didn't come
  // from one of our own `Response.json(...)` handlers — no need to attempt
  // `response.json()` (and risk it "succeeding" on something like a bare
  // numeric/string JSON body that happens to be technically valid JSON but
  // was never actually our API's response shape).
  if (contentType && !contentType.includes("application/json")) {
    const text = await response.text().catch(() => "")
    return {
      ok: false,
      status: response.status,
      message: friendlyNonJsonMessage(response.status),
      // Capped — this is diagnostic/logging material, never shown directly
      // to the user (who only ever sees `message`), and a platform error
      // page can be arbitrarily large.
      raw: text.slice(0, 500),
    }
  }

  try {
    const data = (await response.json()) as T
    return { ok: true, data }
  } catch {
    return {
      ok: false,
      status: response.status,
      message: friendlyNonJsonMessage(response.status),
    }
  }
}
