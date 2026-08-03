import { prisma } from "@/lib/prisma";
import { buildBrandContext } from "@/lib/ai";

export type BrandContextResult = {
  context: string;
  brandKitId: string | null;
};

/**
 * Resolves a Project's Brand Kit into a formatted prompt-context string plus
 * its id (needed for cache keys, e.g. the Planner cache). Shared by every
 * route that needs Brand Kit guidance so the lookup/formatting logic lives
 * in exactly one place.
 */
export async function loadBrandContext(
  projectId: string | undefined | null
): Promise<BrandContextResult> {
  if (!projectId) return { context: "", brandKitId: null };

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { brandKit: true },
    });

    return {
      context: buildBrandContext(project?.brandKit),
      brandKitId: project?.brandKit?.id ?? null,
    };
  } catch (error) {
    // Brand Kit guidance is a nice-to-have, not a requirement — a missing
    // project, a deleted Brand Kit, or a database hiccup should never stop
    // generation from proceeding without it.
    console.error("Failed to load Brand Kit context:", error);
    return { context: "", brandKitId: null };
  }
}
