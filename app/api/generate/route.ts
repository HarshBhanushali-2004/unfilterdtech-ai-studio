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
// This route makes up to 4 SEQUENTIAL Gemini text calls (Research →
// Planner → [Visual Prompt + Instagram Content Generator + whichever
// Carousel/Post/Story/Reel Planner was requested, run CONCURRENTLY below —
// see the Promise.all further down], each with its own resilience pipeline
// (lib/ai/gemini-provider.ts: up to 4 attempts per key with 500ms/1s/2s
// backoff, then key rotation, then model fallback). Every other route in
// this app that runs a comparable or lighter pipeline already declares
// maxDuration (see app/api/creations/route.ts, .../regenerate/route.ts) —
// this route was missing it, which silently left it on the platform's
// default Node.js function timeout (10s on Vercel Hobby). That's fixed
// here, but `maxDuration` is only a ceiling this route asks for — Vercel
// clamps it to whatever the deployed plan actually allows (e.g. 60s on
// Hobby), so it alone doesn't guarantee this route finishes in time. The
// concurrency change below is the other half of the actual fix: it cuts
// the true number of sequential stages a Carousel request needs (the
// longest case) from 5 down to 3, which is what actually gets this route
// under a 60s ceiling in practice, not just under this file's own
// requested 120s. When the platform *does* still kill the function for
// exceeding its limit, it returns its own plain-text/HTML error page
// instead of anything this route ever wrote — which is what produced the
// reported "Unexpected token 'A', "An error o"... is not valid JSON"
// client-side error (see studio-workspace.tsx's parseJsonResponse usage
// and ABOUT.md for the full original trace).
export const maxDuration = 120

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

    // Visual Prompt Engine, Instagram Content Generator, and whichever
    // Carousel/Post/Story/Reel Planner was requested are four genuinely
    // independent Gemini calls — each one's own input type
    // (VisualPromptInput / CarouselPlanInput / PostPlanInput /
    // StoryPlanInput / ReelPlanInput) takes only {planner, research,
    // brandKitId, brandContext}; none of them reads another one's output
    // (confirmed by reading every one of those types, and matches
    // carousel-plan/service.ts's own doc comment: "Independent of the
    // Visual Prompt Engine and the Instagram Content Generator"). They used
    // to run strictly sequentially — 5 Gemini calls end-to-end for a
    // single-format Carousel request — which is the root cause of this
    // route timing out in production (a real Vercel execution-time-limit
    // kill; see the maxDuration comment above and ABOUT.md) even though
    // the exact same pipeline completes fine locally, where there's no
    // platform-imposed ceiling at all. Running them concurrently via
    // Promise.all doesn't change what gets generated, cached, or persisted
    // — each still resolves its own cache-or-Gemini result exactly once —
    // it only cuts this route's wall-clock time from 5 sequential stages
    // down to 3 for Carousel (Research → Planner → everything else at
    // once). The one real trade-off: previously, an invalid
    // Instagram-content response short-circuited before the format
    // Planner ran, saving that one Gemini call; now that call is already
    // in flight by the time content validation fails, so a (rare) content
    // validation failure now costs one extra, discarded Gemini call for
    // whichever single format was requested. Accepted deliberately — the
    // route timing out on the common path is a far worse failure mode than
    // occasionally spending one extra call on a rare one.
    const visualPromptById = inputValidation.data.visualPromptId
      ? await getVisualPromptById(inputValidation.data.visualPromptId)
      : null

    const loadVisualPrompt = async () =>
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

    const loadContent = async () => {
      const generatedContent = await generateInstagramContent(prompt)
      const outputValidation = generatedInstagramContentSchema.safeParse(generatedContent)

      if (!outputValidation.success) {
        throw new AIServiceError("Generated content could not be validated.", 502)
      }

      return outputValidation.data
    }

    // Carousel Planner step — Phase 1's AI Carousel Engine (see AGENTS.md).
    // Only runs when carousel content was actually requested. For CAROUSEL
    // creations this plan (plus the media it resolves to, see
    // `lib/media-resolver/`) becomes the source of truth — not
    // `visualPrompt.carousel` or the content generator's own `carousel`
    // field, which stay populated for backward compatibility (Copy/
    // Download/Edit) but are no longer what the Review page renders.
    const carouselPlanById = inputValidation.data.carouselPlanId
      ? await getCarouselPlanById(inputValidation.data.carouselPlanId)
      : null

    const loadCarouselPlan = async () => {
      if (!inputValidation.data.contentTypes.includes("carousel")) return null
      return (
        carouselPlanById ??
        (await getOrCreateCarouselPlan({
          topic: inputValidation.data.input,
          plannerId: planner.id,
          planner: planner.data,
          research: research.data,
          brandKitId,
          brandContext,
        }))
      )
    }

    // Post Planner step — Phase 1C's Instagram Single Post content type
    // (see AGENTS.md). Same "only run when actually requested" reasoning as
    // the Carousel Planner above.
    const postPlanById = inputValidation.data.postPlanId
      ? await getPostPlanById(inputValidation.data.postPlanId)
      : null

    const loadPostPlan = async () => {
      if (!inputValidation.data.contentTypes.includes("instagram_post")) return null
      return (
        postPlanById ??
        (await getOrCreatePostPlan({
          topic: inputValidation.data.input,
          plannerId: planner.id,
          planner: planner.data,
          research: research.data,
          brandKitId,
          brandContext,
        }))
      )
    }

    // Story Planner step — Phase 1C's Instagram Story content type (see
    // AGENTS.md). Same "only run when actually requested" reasoning.
    const storyPlanById = inputValidation.data.storyPlanId
      ? await getStoryPlanById(inputValidation.data.storyPlanId)
      : null

    const loadStoryPlan = async () => {
      if (!inputValidation.data.contentTypes.includes("story")) return null
      return (
        storyPlanById ??
        (await getOrCreateStoryPlan({
          topic: inputValidation.data.input,
          plannerId: planner.id,
          planner: planner.data,
          research: research.data,
          brandKitId,
          brandContext,
        }))
      )
    }

    // Reel Planner step — Phase 1C's Instagram Reel content type (see
    // AGENTS.md). Scene/shot plan only — no video composition exists yet.
    const reelPlanById = inputValidation.data.reelPlanId
      ? await getReelPlanById(inputValidation.data.reelPlanId)
      : null

    const loadReelPlan = async () => {
      if (!inputValidation.data.contentTypes.includes("reel")) return null
      return (
        reelPlanById ??
        (await getOrCreateReelPlan({
          topic: inputValidation.data.input,
          plannerId: planner.id,
          planner: planner.data,
          research: research.data,
          brandKitId,
          brandContext,
        }))
      )
    }

    const [visualPrompt, contentData, carouselPlan, postPlan, storyPlan, reelPlan] =
      await Promise.all([
        loadVisualPrompt(),
        loadContent(),
        loadCarouselPlan(),
        loadPostPlan(),
        loadStoryPlan(),
        loadReelPlan(),
      ])

    return Response.json({
      data: contentData,
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
