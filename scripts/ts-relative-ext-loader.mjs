// Tiny Node ESM loader hook used only by scripts/verify-gemini-resilience.ts.
// The app's TypeScript source uses extensionless relative imports (fine for
// Next.js's bundler-mode resolution), but plain Node ESM requires an
// explicit extension. This hook tries ".ts"/".tsx"/".js" for any
// extensionless relative specifier before falling back to normal
// resolution, so the verification script can import real source files
// unmodified.
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

const CANDIDATE_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"]

export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../")
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(specifier)

  if (isRelative && !hasExtension) {
    for (const ext of CANDIDATE_EXTENSIONS) {
      const candidateUrl = new URL(specifier + ext, context.parentURL)
      if (existsSync(fileURLToPath(candidateUrl))) {
        return nextResolve(specifier + ext, context)
      }
    }
  }

  return nextResolve(specifier, context)
}
