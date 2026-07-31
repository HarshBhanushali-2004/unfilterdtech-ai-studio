import type { z } from "zod"

/**
 * Converts a Zod validation error into a single, human-readable message
 * instead of exposing the raw array of Zod issues to end users.
 */
export function formatZodError(error: z.ZodError): string {
  const [firstIssue] = error.issues

  if (!firstIssue) {
    return "Invalid input."
  }

  const path = firstIssue.path.join(".")

  return path ? `${path}: ${firstIssue.message}` : firstIssue.message
}
