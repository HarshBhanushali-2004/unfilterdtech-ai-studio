import type { Prisma } from "@prisma/client";

import { AIServiceError, generateEvaluation } from "@/lib/ai";
import { loadBrandContext } from "@/lib/brand-kit/load-context";

export type EvaluateCreationResult = {
  qualityScore: Prisma.InputJsonValue | undefined;
  suggestions: Prisma.InputJsonValue | undefined;
};

/**
 * AI Quality Score + AI Suggestions against a piece of finished content.
 * Shared by the save flow (`POST /api/creations`, runs once at save time)
 * and the "Regenerate" flow (`POST /api/creations/[id]/regenerate`, runs
 * again against the fresh content so the score shown under Developer
 * Details never describes stale copy). Best-effort: a failure here (e.g.
 * Gemini unavailable) must never block saving/regenerating the creation
 * itself, matching the existing Brand Kit context resilience pattern.
 */
export async function evaluateCreation(
  caption: string,
  hashtags: unknown,
  projectId: string | null
): Promise<EvaluateCreationResult> {
  try {
    const { context: brandContext } = await loadBrandContext(projectId);
    const normalizedHashtags = Array.isArray(hashtags) ? (hashtags as string[]) : [];

    const evaluation = await generateEvaluation(
      { caption, hashtags: normalizedHashtags },
      brandContext
    );

    return {
      qualityScore: evaluation.scores as unknown as Prisma.InputJsonValue,
      suggestions: evaluation.suggestions as unknown as Prisma.InputJsonValue,
    };
  } catch (error) {
    console.error("Failed to evaluate creation:", error instanceof AIServiceError ? error.message : error);
    return { qualityScore: undefined, suggestions: undefined };
  }
}
