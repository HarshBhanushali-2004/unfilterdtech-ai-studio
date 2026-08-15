import type { BrandKit, PostMedia } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import type { PostPlanObject } from "@/lib/ai/post-planner-schemas"
import { errorCodeFor, errorMessageFor } from "@/lib/format-media/errors"
import { loadBrandLogo } from "@/lib/format-media/load-brand-logo"
import { loadStillImageForCompositing } from "@/lib/format-media/load-still-image"
import { resolveSlideMedia } from "@/lib/media-resolver/service"
import { brandKitToRenderProfile } from "@/lib/template-renderer/brand-profile"
import { renderFrame } from "@/lib/template-renderer/render-frame"
import { getTemplate } from "@/lib/template-renderer/registry"
import { createNodeCanvas, ensureNodeFontsRegistered } from "@/lib/creative-renderer/node-canvas"

import type { PostMediaDTO } from "./types"

function toDTO(record: PostMedia): PostMediaDTO {
  return {
    id: record.id,
    postPlanId: record.postPlanId,
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

/** The rendered/resolved media for a Post Plan — used to hydrate the Review page's post preview on load/reload. Null when generation hasn't been triggered at all yet (e.g. a pre-Phase-1C creation). */
export async function getPostMedia(postPlanId: string): Promise<PostMediaDTO | null> {
  const record = await prisma.postMedia.findUnique({ where: { postPlanId } })
  return record ? toDTO(record) : null
}

export type GenerateMediaForPostPlanInput = {
  postPlanId: string
  plan: PostPlanObject
  brandKit: BrandKit | null
  forceRegenerate?: boolean
}

/**
 * Resolves and renders a Post Plan's single item — Phase 1C's
 * `PostPlan → MediaAsset → rendered post` pipeline (AGENTS.md), the
 * one-item counterpart to `generateMediaForCarouselPlan`
 * (`lib/carousel-plan/generate-media-for-plan.ts`). Uses the Brand Kit's
 * selected template family so a post always matches the same visual
 * identity as this brand's Carousel/Story/Reel content.
 */
export async function generateMediaForPostPlan({
  postPlanId,
  plan,
  brandKit,
  forceRegenerate = false,
}: GenerateMediaForPostPlanInput): Promise<PostMediaDTO> {
  ensureNodeFontsRegistered()

  if (!forceRegenerate) {
    const existing = await prisma.postMedia.findUnique({ where: { postPlanId } })
    if (existing && existing.status === "COMPLETED") {
      return toDTO(existing)
    }
  }

  const pending = await prisma.postMedia.upsert({
    where: { postPlanId },
    create: { postPlanId, mediaType: plan.mediaType, status: "RESOLVING" },
    update: { mediaType: plan.mediaType, status: "RESOLVING", errorMessage: null, errorCode: null },
  })

  const layout = getTemplate(brandKit?.templateFamilyId).formats.post
  const brandProfile = brandKitToRenderProfile(brandKit)
  const brandLabel = brandKit?.name ?? ""

  try {
    const logoImage = await loadBrandLogo(brandProfile)

    const { mediaAsset, resolutionPath } = await resolveSlideMedia({
      slide: {
        order: 1,
        purpose: "Post",
        mediaType: plan.mediaType,
        mediaQuery: plan.mediaQuery,
        imageGenerationPrompt: plan.imageGenerationPrompt,
        headline: plan.headline,
        body: plan.body,
        cta: plan.cta,
        visualIntent: "",
      },
    })

    await prisma.postMedia.update({
      where: { id: pending.id },
      data: { status: "RENDERING", mediaAssetId: mediaAsset?.id ?? null, resolutionPath },
    })

    const mediaImage = mediaAsset ? await loadStillImageForCompositing(mediaAsset, "post") : null

    const { ctx, toPngDataUrl } = createNodeCanvas(layout.canvas.width, layout.canvas.height)

    renderFrame(ctx, {
      layout,
      content: { category: plan.category, headline: plan.headline, body: plan.body, cta: plan.cta },
      media: mediaImage,
      noMedia: false,
      logo: logoImage,
      brand: brandProfile,
      brandLabel,
    })

    const completed = await prisma.postMedia.update({
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
    console.error("[PostRenderer] Post media generation failed:", error)

    const failed = await prisma.postMedia.update({
      where: { id: pending.id },
      data: {
        status: "FAILED",
        errorMessage: errorMessageFor(error, "This post could not be generated."),
        errorCode: errorCodeFor(error),
      },
    })

    return toDTO(failed)
  }
}
