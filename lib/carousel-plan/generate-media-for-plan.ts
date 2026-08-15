import type { BrandKit, CarouselSlideMedia } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import type { CarouselPlanObject, CarouselPlanSlide } from "@/lib/ai/carousel-planner-schemas"
import { MAX_CONCURRENT_MEDIA_REQUESTS, mapWithConcurrencyLimit } from "@/lib/format-media/concurrency"
import { errorCodeFor, errorMessageFor } from "@/lib/format-media/errors"
import { loadBrandLogo } from "@/lib/format-media/load-brand-logo"
import { loadStillImageForCompositing } from "@/lib/format-media/load-still-image"
import { resolveSlideMedia } from "@/lib/media-resolver/service"
import { brandKitToRenderProfile } from "@/lib/template-renderer/brand-profile"
import { renderFrame } from "@/lib/template-renderer/render-frame"
import { getTemplate } from "@/lib/template-renderer/registry"
import { createNodeCanvas, ensureNodeFontsRegistered } from "@/lib/creative-renderer/node-canvas"
import type { RenderImageLike } from "@/lib/creative-renderer/types"

import type { CarouselSlideMediaDTO } from "./types"

function toDTO(record: CarouselSlideMedia): CarouselSlideMediaDTO {
  return {
    id: record.id,
    carouselPlanId: record.carouselPlanId,
    slideOrder: record.slideOrder,
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

/** All generated/rendered slide media for a Carousel Plan — used to hydrate the Review page's carousel gallery on load/reload. */
export async function listCarouselSlideMedia(carouselPlanId: string): Promise<CarouselSlideMediaDTO[]> {
  const records = await prisma.carouselSlideMedia.findMany({
    where: { carouselPlanId },
    orderBy: { slideOrder: "asc" },
  })
  return records.map(toDTO)
}

type ResolveAndRenderSlideOptions = {
  carouselPlanId: string
  plan: CarouselPlanObject
  slide: CarouselPlanSlide
  layout: ReturnType<typeof getTemplate>["formats"]["carousel"]
  brandProfile: ReturnType<typeof brandKitToRenderProfile>
  brandLabel: string
  logoImage: RenderImageLike | null
  forceRegenerate: boolean
}

async function resolveAndRenderSlide({
  carouselPlanId,
  plan,
  slide,
  layout,
  brandProfile,
  brandLabel,
  logoImage,
  forceRegenerate,
}: ResolveAndRenderSlideOptions): Promise<CarouselSlideMediaDTO> {
  const where = { carouselPlanId_slideOrder: { carouselPlanId, slideOrder: slide.order } }

  if (!forceRegenerate) {
    const existing = await prisma.carouselSlideMedia.findUnique({ where })
    if (existing && existing.status === "COMPLETED") {
      return toDTO(existing)
    }
  }

  const pending = await prisma.carouselSlideMedia.upsert({
    where,
    create: {
      carouselPlanId,
      slideOrder: slide.order,
      mediaType: slide.mediaType,
      status: "RESOLVING",
    },
    update: {
      mediaType: slide.mediaType,
      status: "RESOLVING",
      errorMessage: null,
      errorCode: null,
    },
  })

  try {
    const { mediaAsset, resolutionPath } = await resolveSlideMedia({ slide })

    await prisma.carouselSlideMedia.update({
      where: { id: pending.id },
      data: { status: "RENDERING", mediaAssetId: mediaAsset?.id ?? null, resolutionPath },
    })

    const mediaImage = mediaAsset ? await loadStillImageForCompositing(mediaAsset, `carousel slide ${slide.order}`) : null

    const { ctx, toPngDataUrl } = createNodeCanvas(layout.canvas.width, layout.canvas.height)

    renderFrame(ctx, {
      layout,
      content: {
        category: plan.category,
        headline: slide.headline,
        body: slide.body,
        cta: slide.cta,
        progress: `${slide.order} / ${plan.slides.length}`,
      },
      media: mediaImage,
      noMedia: slide.mediaType === "NO_MEDIA",
      logo: logoImage,
      brand: brandProfile,
      brandLabel,
    })

    const completed = await prisma.carouselSlideMedia.update({
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
    console.error(`[CarouselRenderer] Slide ${slide.order} failed:`, error)

    const failed = await prisma.carouselSlideMedia.update({
      where: { id: pending.id },
      data: {
        status: "FAILED",
        errorMessage: errorMessageFor(error, "This slide could not be generated."),
        errorCode: errorCodeFor(error),
      },
    })

    return toDTO(failed)
  }
}

export type GenerateMediaForCarouselPlanInput = {
  carouselPlanId: string
  plan: CarouselPlanObject
  brandKit: BrandKit | null
  /** Force every slide to re-resolve and re-render, even if already COMPLETED — the Review page's Regenerate action. */
  forceRegenerate?: boolean
}

/**
 * Resolves and renders every slide of a Carousel Plan — Phase 1's
 * `CarouselSlide → MediaAsset → rendered slide` pipeline (AGENTS.md). Same
 * best-effort-per-slot shape as `generateImagesForCreation`
 * (`lib/image-generation/generate-for-creation.ts`): one slide failing (a
 * Gemini exhaustion, an image decode error) never blocks the others, and is
 * persisted as that slide's own FAILED status rather than thrown — see
 * `resolveAndRenderSlide` above. Caps concurrent media requests
 * (`MAX_CONCURRENT_MEDIA_REQUESTS`, `lib/format-media/concurrency.ts`)
 * rather than firing every slide at the image provider at once.
 *
 * Uses the Brand Kit's selected template family (`brandKit.templateFamilyId`,
 * resolved through `lib/template-renderer/registry.ts`) — Phase 1C's
 * Unified Content Template System, see AGENTS.md — so a carousel always
 * matches the same visual identity as this brand's Post/Story/Reel content.
 */
export async function generateMediaForCarouselPlan({
  carouselPlanId,
  plan,
  brandKit,
  forceRegenerate = false,
}: GenerateMediaForCarouselPlanInput): Promise<CarouselSlideMediaDTO[]> {
  ensureNodeFontsRegistered()

  const layout = getTemplate(brandKit?.templateFamilyId).formats.carousel
  const brandProfile = brandKitToRenderProfile(brandKit)
  const brandLabel = brandKit?.name ?? ""
  const logoImage = await loadBrandLogo(brandProfile)

  return mapWithConcurrencyLimit(plan.slides, MAX_CONCURRENT_MEDIA_REQUESTS, (slide) =>
    resolveAndRenderSlide({
      carouselPlanId,
      plan,
      slide,
      layout,
      brandProfile,
      brandLabel,
      logoImage,
      forceRegenerate,
    })
  )
}
