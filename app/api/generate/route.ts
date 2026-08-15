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
import { getCarouselPlanById, getOrCreateCarouselPlan } from "@/lib/carousel-plan/service"
import { getOrCreatePostPlan, getPostPlanById } from "@/lib/post-plan/service"
import { getOrCreateStoryPlan, getStoryPlanById } from "@/lib/story-plan/service"
import { getOrCreateReelPlan, getReelPlanById } from "@/lib/reel-plan/service"
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

    // Carousel Planner step — Phase 1's AI Carousel Engine (see AGENTS.md).
    // Only runs when carousel content was actually requested: it's an
    // independent intelligence stage from the Visual Prompt Engine above,
    // and for CAROUSEL creations it (plus the media it resolves to, see
    // `lib/media-resolver/`) becomes the source of truth — not
    // `visualPrompt.carousel` or `outputValidation.data.carousel`, which
    // stay populated for backward compatibility (Copy/Download/Edit) but
    // are no longer what the Review page renders for a carousel.
    let carouselPlan: Awaited<ReturnType<typeof getOrCreateCarouselPlan>> | null = null
    if (inputValidation.data.contentTypes.includes("carousel")) {
      const carouselPlanById = inputValidation.data.carouselPlanId
        ? await getCarouselPlanById(inputValidation.data.carouselPlanId)
        : null

      carouselPlan =
        carouselPlanById ??
        (await getOrCreateCarouselPlan({
          topic: inputValidation.data.input,
          plannerId: planner.id,
          planner: planner.data,
          research: research.data,
          brandKitId,
          brandContext,
        }))
    }

    // Post Planner step — Phase 1C's Instagram Single Post content type
    // (see AGENTS.md). Same "only run when actually requested" reasoning as
    // the Carousel Planner above.
    let postPlan: Awaited<ReturnType<typeof getOrCreatePostPlan>> | null = null
    if (inputValidation.data.contentTypes.includes("instagram_post")) {
      const postPlanById = inputValidation.data.postPlanId
        ? await getPostPlanById(inputValidation.data.postPlanId)
        : null

      postPlan =
        postPlanById ??
        (await getOrCreatePostPlan({
          topic: inputValidation.data.input,
          plannerId: planner.id,
          planner: planner.data,
          research: research.data,
          brandKitId,
          brandContext,
        }))
    }

    // Story Planner step — Phase 1C's Instagram Story content type (see
    // AGENTS.md). Same "only run when actually requested" reasoning.
    let storyPlan: Awaited<ReturnType<typeof getOrCreateStoryPlan>> | null = null
    if (inputValidation.data.contentTypes.includes("story")) {
      const storyPlanById = inputValidation.data.storyPlanId
        ? await getStoryPlanById(inputValidation.data.storyPlanId)
        : null

      storyPlan =
        storyPlanById ??
        (await getOrCreateStoryPlan({
          topic: inputValidation.data.input,
          plannerId: planner.id,
          planner: planner.data,
          research: research.data,
          brandKitId,
          brandContext,
        }))
    }

    // Reel Planner step — Phase 1C's Instagram Reel content type (see
    // AGENTS.md). Scene/shot plan only — no video composition exists yet.
    let reelPlan: Awaited<ReturnType<typeof getOrCreateReelPlan>> | null = null
    if (inputValidation.data.contentTypes.includes("reel")) {
      const reelPlanById = inputValidation.data.reelPlanId
        ? await getReelPlanById(inputValidation.data.reelPlanId)
        : null

      reelPlan =
        reelPlanById ??
        (await getOrCreateReelPlan({
          topic: inputValidation.data.input,
          plannerId: planner.id,
          planner: planner.data,
          research: research.data,
          brandKitId,
          brandContext,
        }))
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
      carouselPlan: carouselPlan?.data ?? null,
      carouselPlanId: carouselPlan?.id ?? null,
      carouselPlanCached: carouselPlan?.cached ?? false,
      postPlan: postPlan?.data ?? null,
      postPlanId: postPlan?.id ?? null,
      postPlanCached: postPlan?.cached ?? false,
      storyPlan: storyPlan?.data ?? null,
      storyPlanId: storyPlan?.id ?? null,
      storyPlanCached: storyPlan?.cached ?? false,
      reelPlan: reelPlan?.data ?? null,
      reelPlanId: reelPlan?.id ?? null,
      reelPlanCached: reelPlan?.cached ?? false,
    })
  } catch (error) {
    if (error instanceof AIServiceError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    return Response.json({ error: "Unable to generate content right now." }, { status: 500 })
  }
}
