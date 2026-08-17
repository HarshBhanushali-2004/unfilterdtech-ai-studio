import type { BrandKit, StoryFrameMedia } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import type { StoryPlanFrame, StoryPlanObject } from "@/lib/ai/story-planner-schemas"
import { MAX_CONCURRENT_MEDIA_REQUESTS, mapWithConcurrencyLimit } from "@/lib/format-media/concurrency"
import { errorCodeFor, errorMessageFor } from "@/lib/format-media/errors"
import { loadBrandLogo } from "@/lib/format-media/load-brand-logo"
import { loadStillImageForCompositing } from "@/lib/format-media/load-still-image"
import { resolveSlideMedia } from "@/lib/media-resolver/service"
import { brandKitToRenderProfile } from "@/lib/template-renderer/brand-profile"
import { renderFrame } from "@/lib/template-renderer/render-frame"
import { getComposition, getTemplate } from "@/lib/template-renderer/registry"
import { selectComposition } from "@/lib/template-renderer/composition-selector"
import { createNodeCanvas, ensureNodeFontsRegistered } from "@/lib/creative-renderer/node-canvas"
import type { RenderImageLike } from "@/lib/creative-renderer/types"
import type { TemplateFamily } from "@/lib/template-renderer/types"

import type { StoryFrameMediaDTO } from "./types"

function toDTO(record: StoryFrameMedia): StoryFrameMediaDTO {
  return {
    id: record.id,
    storyPlanId: record.storyPlanId,
    frameOrder: record.frameOrder,
    mediaType: record.mediaType,
    mediaAssetId: record.mediaAssetId,
    renderedImageUrl: record.renderedImageUrl,
    width: record.width,
    height: record.height,
    status: record.status,
    resolutionPath: record.resolutionPath,
    errorMessage: record.errorMessage,
    errorCode: record.errorCode,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

/** All generated/rendered frame media for a Story Plan — used to hydrate the Review page's story gallery on load/reload. */
export async function listStoryFrameMedia(storyPlanId: string): Promise<StoryFrameMediaDTO[]> {
  const records = await prisma.storyFrameMedia.findMany({
    where: { storyPlanId },
    orderBy: { frameOrder: "asc" },
  })
  return records.map(toDTO)
}

type ResolveAndRenderFrameOptions = {
  storyPlanId: string
  plan: StoryPlanObject
  frame: StoryPlanFrame
  template: TemplateFamily
  brandProfile: ReturnType<typeof brandKitToRenderProfile>
  brandLabel: string
  logoImage: RenderImageLike | null
  forceRegenerate: boolean
}

async function resolveAndRenderFrame({
  storyPlanId,
  plan,
  frame,
  template,
  brandProfile,
  brandLabel,
  logoImage,
  forceRegenerate,
}: ResolveAndRenderFrameOptions): Promise<StoryFrameMediaDTO> {
  const where = { storyPlanId_frameOrder: { storyPlanId, frameOrder: frame.order } }

  if (!forceRegenerate) {
    const existing = await prisma.storyFrameMedia.findUnique({ where })
    if (existing && existing.status === "COMPLETED") {
      return toDTO(existing)
    }
  }

  const pending = await prisma.storyFrameMedia.upsert({
    where,
    create: { storyPlanId, frameOrder: frame.order, mediaType: frame.mediaType, status: "RESOLVING" },
    update: { mediaType: frame.mediaType, status: "RESOLVING", errorMessage: null, errorCode: null },
  })

  try {
    const { mediaAsset, resolutionPath } = await resolveSlideMedia({ slide: frame })

    await prisma.storyFrameMedia.update({
      where: { id: pending.id },
      data: { status: "RENDERING", mediaAssetId: mediaAsset?.id ?? null, resolutionPath },
    })

    const mediaImage = mediaAsset ? await loadStillImageForCompositing(mediaAsset, `story frame ${frame.order}`) : null

    const compositionId = selectComposition({
      format: "story",
      headline: frame.headline,
      body: frame.body,
      mediaType: frame.mediaType,
      order: frame.order,
      total: plan.frames.length,
    })
    const layout = getComposition(template, "story", compositionId)

    const { ctx, toPngDataUrl } = createNodeCanvas(layout.canvas.width, layout.canvas.height)

    renderFrame(ctx, {
      layout,
      content: {
        category: plan.category,
        headline: frame.headline,
        body: frame.body,
        cta: frame.cta,
        progress: `${frame.order} / ${plan.frames.length}`,
      },
      media: mediaImage,
      noMedia: frame.mediaType === "NO_MEDIA",
      logo: logoImage,
      brand: brandProfile,
      brandLabel,
    })

    const completed = await prisma.storyFrameMedia.update({
      where: { id: pending.id },
      data: {
        status: "COMPLETED",
        renderedImageUrl: toPngDataUrl(),
        width: layout.canvas.width,
        height: layout.canvas.height,
        errorMessage: null,
        errorCode: null,
      },
    })

    return toDTO(completed)
  } catch (error) {
    console.error(`[StoryRenderer] Frame ${frame.order} failed:`, error)

    const failed = await prisma.storyFrameMedia.update({
      where: { id: pending.id },
      data: {
        status: "FAILED",
        errorMessage: errorMessageFor(error, "This frame could not be generated."),
        errorCode: errorCodeFor(error),
      },
    })

    return toDTO(failed)
  }
}

export type GenerateMediaForStoryPlanInput = {
  storyPlanId: string
  plan: StoryPlanObject
  brandKit: BrandKit | null
  forceRegenerate?: boolean
}

/**
 * Resolves and renders every frame of a Story Plan — Phase 1C's
 * `StoryFrame → MediaAsset → rendered frame` pipeline (AGENTS.md), the
 * frame-sequence counterpart to `generateMediaForCarouselPlan`. Same
 * best-effort-per-frame shape and bounded concurrency
 * (`MAX_CONCURRENT_MEDIA_REQUESTS`).
 */
export async function generateMediaForStoryPlan({
  storyPlanId,
  plan,
  brandKit,
  forceRegenerate = false,
}: GenerateMediaForStoryPlanInput): Promise<StoryFrameMediaDTO[]> {
  ensureNodeFontsRegistered()

  const template = getTemplate(brandKit?.templateFamilyId)
  const brandProfile = brandKitToRenderProfile(brandKit)
  const brandLabel = brandKit?.name ?? ""
  const logoImage = await loadBrandLogo(brandProfile)

  return mapWithConcurrencyLimit(plan.frames, MAX_CONCURRENT_MEDIA_REQUESTS, (frame) =>
    resolveAndRenderFrame({
      storyPlanId,
      plan,
      frame,
      template,
      brandProfile,
      brandLabel,
      logoImage,
      forceRegenerate,
    })
  )
}
