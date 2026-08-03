import {
  AIServiceError,
  buildInstagramContentPrompt,
  generateContentInputSchema,
  generateInstagramContent,
  generatedInstagramContentSchema,
} from "@/lib/ai"
import { getOrCreateResearch, getResearchById } from "@/lib/research/service"
import { getOrCreatePlanner, getPlannerById } from "@/lib/planner/service"
import { getOrCreateVisualPrompt, getVisualPromptById } from "@/lib/visual-prompt/service"
import { loadBrandContext } from "@/lib/brand-kit/load-context"
import { formatZodError } from "@/lib/validation"

export const runtime = "nodejs"

/**
 * Research Engine step — the first intelligence stage of every generation.
 * Reuses a specific prior brief when `researchId` is supplied (e.g.
 * regenerating content for an existing creation); otherwise resolves
 * research from the topic cache, falling back to a fresh Gemini research
 * call on a miss.
 */
async function loadResearch(topicInput: string, researchId: string | undefined) {
  if (researchId) {
    const byId = await getResearchById(researchId)
    if (byId) return byId
  }

  return getOrCreateResearch(topicInput)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 })
  }

  const inputValidation = generateContentInputSchema.safeParse(body)
  if (!inputValidation.success) {
    return Response.json(
      { error: formatZodError(inputValidation.error) },
      { status: 400 }
    )
  }

  try {
    const { context: brandContext, brandKitId } = await loadBrandContext(
      inputValidation.data.projectId
    )
    const research = await loadResearch(
      inputValidation.data.input,
      inputValidation.data.researchId
    )

    // AI Planner step — the second intelligence stage, after Research and
    // before generation. Unlike Research, this is brand/tone-sensitive, so
    // it's cached per (research, Brand Kit, tone, creativity) combination.
    const plannerById = inputValidation.data.plannerId
      ? await getPlannerById(inputValidation.data.plannerId)
      : null

    const planner =
      plannerById ??
      (await getOrCreatePlanner({
        researchId: research.id,
        research: research.data,
        brandKitId,
        brandContext,
        tone: inputValidation.data.tone,
        creativity: inputValidation.data.creativity,
      }))

    // Visual Prompt Engine step — the third intelligence stage, after the
    // Planner and before generation. Runs independently of the Instagram
    // Content Generator below; its output is never mixed into that prompt.
    const visualPromptById = inputValidation.data.visualPromptId
      ? await getVisualPromptById(inputValidation.data.visualPromptId)
      : null

    const visualPrompt =
      visualPromptById ??
      (await getOrCreateVisualPrompt({
        plannerId: planner.id,
        planner: planner.data,
        research: research.data,
        brandKitId,
        brandContext,
      }))

    const prompt = buildInstagramContentPrompt(
      inputValidation.data,
      research.data,
      planner.data,
      brandContext
    )
    const generatedContent = await generateInstagramContent(prompt)
    const outputValidation = generatedInstagramContentSchema.safeParse(generatedContent)

    if (!outputValidation.success) {
      return Response.json({ error: "Generated content could not be validated." }, { status: 502 })
    }

    return Response.json({
      data: outputValidation.data,
      research: research.data,
      researchId: research.id,
      researchCached: research.cached,
      planner: planner.data,
      plannerId: planner.id,
      plannerCached: planner.cached,
      visualPrompt: visualPrompt.data,
      visualPromptId: visualPrompt.id,
      visualPromptCached: visualPrompt.cached,
    })
  } catch (error) {
    if (error instanceof AIServiceError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    return Response.json({ error: "Unable to generate content right now." }, { status: 500 })
  }
}
