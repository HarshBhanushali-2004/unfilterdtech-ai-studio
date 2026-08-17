import type { BrandKit, ReelSceneMedia } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import type { ReelPlanObject, ReelPlanScene } from "@/lib/ai/reel-planner-schemas"
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

import type { ReelSceneMediaDTO } from "./types"

function toDTO(record: ReelSceneMedia): ReelSceneMediaDTO {
  return {
    id: record.id,
    reelPlanId: record.reelPlanId,
    sceneOrder: record.sceneOrder,
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

/** All generated/rendered scene storyboard previews for a Reel Plan — used to hydrate the Review page's reel storyboard on load/reload. */
export async function listReelSceneMedia(reelPlanId: string): Promise<ReelSceneMediaDTO[]> {
  const records = await prisma.reelSceneMedia.findMany({
    where: { reelPlanId },
    orderBy: { sceneOrder: "asc" },
  })
  return records.map(toDTO)
}

type ResolveAndRenderSceneOptions = {
  reelPlanId: string
  plan: ReelPlanObject
  scene: ReelPlanScene
  template: TemplateFamily
  brandProfile: ReturnType<typeof brandKitToRenderProfile>
  brandLabel: string
  logoImage: RenderImageLike | null
  forceRegenerate: boolean
}

async function resolveAndRenderScene({
  reelPlanId,
  plan,
  scene,
  template,
  brandProfile,
  brandLabel,
  logoImage,
  forceRegenerate,
}: ResolveAndRenderSceneOptions): Promise<ReelSceneMediaDTO> {
  const where = { reelPlanId_sceneOrder: { reelPlanId, sceneOrder: scene.order } }

  if (!forceRegenerate) {
    const existing = await prisma.reelSceneMedia.findUnique({ where })
    if (existing && existing.status === "COMPLETED") {
      return toDTO(existing)
    }
  }

  const pending = await prisma.reelSceneMedia.upsert({
    where,
    create: { reelPlanId, sceneOrder: scene.order, mediaType: scene.mediaType, status: "RESOLVING" },
    update: { mediaType: scene.mediaType, status: "RESOLVING", errorMessage: null, errorCode: null },
  })

  try {
    // Reel scenes are always IMAGE or VIDEO (never NO_MEDIA — a scene with
    // no visual isn't a scene, see reelSceneMediaTypes' doc comment), so
    // this always resolves to a real asset (generated, since no source
    // provider is registered — see lib/media-resolver/service.ts).
    const { mediaAsset, resolutionPath } = await resolveSlideMedia({
      slide: {
        order: scene.order,
        purpose: scene.purpose,
        mediaType: scene.mediaType,
        mediaQuery: scene.mediaQuery,
        imageGenerationPrompt: scene.imageGenerationPrompt,
        headline: scene.onScreenText,
        body: "",
        cta: scene.cta,
        visualIntent: "",
      },
    })

    await prisma.reelSceneMedia.update({
      where: { id: pending.id },
      data: { status: "RENDERING", mediaAssetId: mediaAsset?.id ?? null, resolutionPath },
    })

    const mediaImage = mediaAsset ? await loadStillImageForCompositing(mediaAsset, `reel scene ${scene.order}`) : null

    const compositionId = selectComposition({
      format: "reel",
      headline: scene.onScreenText,
      body: "",
      mediaType: scene.mediaType,
      order: scene.order,
      total: plan.sceneCount,
    })
    const layout = getComposition(template, "reel", compositionId)

    const { ctx, toPngDataUrl } = createNodeCanvas(layout.canvas.width, layout.canvas.height)

    renderFrame(ctx, {
      layout,
      content: {
        category: scene.purpose,
        headline: scene.onScreenText,
        body: "",
        cta: scene.cta,
        progress: `Scene ${scene.order} / ${plan.sceneCount}`,
      },
      media: mediaImage,
      noMedia: false,
      logo: logoImage,
      brand: brandProfile,
      brandLabel,
    })

    const completed = await prisma.reelSceneMedia.update({
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
    console.error(`[ReelRenderer] Scene ${scene.order} failed:`, error)

    const failed = await prisma.reelSceneMedia.update({
      where: { id: pending.id },
      data: {
        status: "FAILED",
        errorMessage: errorMessageFor(error, "This scene preview could not be generated."),
        errorCode: errorCodeFor(error),
      },
    })

    return toDTO(failed)
  }
}

export type GenerateMediaForReelPlanInput = {
  reelPlanId: string
  plan: ReelPlanObject
  brandKit: BrandKit | null
  forceRegenerate?: boolean
}

/**
 * Resolves and renders every scene of a Reel Plan as a static storyboard
 * preview — Phase 1C's `ReelScene → MediaAsset → rendered preview`
 * pipeline (AGENTS.md). **Never produces a video** — no video composition
 * exists in this phase (see `ReelPlan`'s Prisma doc comment); each scene's
 * `renderedImageUrl` is a single representative frame, not a clip. Same
 * best-effort-per-scene shape and bounded concurrency as the other
 * formats' media generation.
 */
export async function generateMediaForReelPlan({
  reelPlanId,
  plan,
  brandKit,
  forceRegenerate = false,
}: GenerateMediaForReelPlanInput): Promise<ReelSceneMediaDTO[]> {
  ensureNodeFontsRegistered()

  const template = getTemplate(brandKit?.templateFamilyId)
  const brandProfile = brandKitToRenderProfile(brandKit)
  const brandLabel = brandKit?.name ?? ""
  const logoImage = await loadBrandLogo(brandProfile)

  return mapWithConcurrencyLimit(plan.scenes, MAX_CONCURRENT_MEDIA_REQUESTS, (scene) =>
    resolveAndRenderScene({
      reelPlanId,
      plan,
      scene,
      template,
      brandProfile,
      brandLabel,
      logoImage,
      forceRegenerate,
    })
  )
}
