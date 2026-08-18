import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCanvaAccessToken } from "@/lib/canva/auth";
import { CanvaApiError } from "@/lib/canva/errors";
import { importPostDesign } from "@/lib/canva/design-import";
import { buildPostPptx } from "@/lib/canva/pptx-builder";
import { getPostPlanById } from "@/lib/post-plan/service";
import { brandKitToRenderProfile } from "@/lib/template-renderer/brand-profile";
import { selectComposition } from "@/lib/template-renderer/composition-selector";
import { getComposition, getTemplate } from "@/lib/template-renderer/registry";
import type { FrameContent } from "@/lib/template-renderer/types";

// Calls Canva's Design Import API (an outbound fetch, plus polling) — needs
// the Node runtime, matching every other route in this app that calls an
// external SDK/API (CLAUDE.md Section 20).
export const runtime = "nodejs";
// Building the .pptx is fast, but the import job's poll loop can take a
// several-second round trip — same reasoning as regenerate's maxDuration.
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * "Edit in Canva" (Phase 2 — see CANVA_NEXT_PHASE_PLAN.md §4/§9). Builds a
 * `.pptx` from this Post's current layout/content, imports it as a new
 * Canva design, and persists the result so the Review page can open it.
 *
 * No session/user check — this app has no authentication anywhere
 * (CLAUDE.md Section 8); every route is equally open, and this one is no
 * exception. "Verify the current user" here means only what every other
 * route already means: confirm the requested Creation exists.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const creation = await prisma.creation.findUnique({
      where: { id },
      include: { project: { include: { brandKit: true } } },
    });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found." }, { status: 404 });
    }

    if (creation.contentType !== "POST") {
      // Phase 2 explicitly scopes to POST only (see CANVA_NEXT_PHASE_PLAN.md
      // §11/§15) — Carousel/Story/Reel are deliberately not supported yet.
      return NextResponse.json(
        { error: "Edit in Canva is currently only available for Post creations." },
        { status: 400 }
      );
    }

    if (!creation.postPlanId) {
      return NextResponse.json(
        { error: "This post hasn't been generated through the current pipeline yet." },
        { status: 400 }
      );
    }

    const postPlan = await getPostPlanById(creation.postPlanId);
    if (!postPlan) {
      return NextResponse.json({ error: "This post's layout could not be loaded." }, { status: 404 });
    }

    const postMedia = await prisma.postMedia.findUnique({
      where: { postPlanId: creation.postPlanId },
      include: { mediaAsset: true },
    });

    if (!postMedia || postMedia.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "This post's image hasn't finished generating yet — try again once it's ready." },
        { status: 400 }
      );
    }

    // Check the Canva connection *before* touching this Creation's
    // canvaSyncStatus — a "not connected" response must never leave the
    // row stuck mid-import.
    let accessToken: string;
    try {
      accessToken = await getCanvaAccessToken();
    } catch (error) {
      if (error instanceof CanvaApiError && (error.code === "not_connected" || error.code === "reconnect_required")) {
        // Safe, expected response the UI uses to kick off the existing
        // Canva OAuth flow (`/api/canva/connect`) — not a second OAuth
        // implementation, just a signal.
        return NextResponse.json({ error: error.message, needsConnect: true }, { status: 409 });
      }
      throw error;
    }

    await prisma.creation.update({ where: { id }, data: { canvaSyncStatus: "IMPORTING" } });

    const brandKit = creation.project?.brandKit ?? null;
    const template = getTemplate(brandKit?.templateFamilyId);
    const compositionId = selectComposition({
      format: "post",
      headline: postPlan.data.headline,
      body: postPlan.data.body,
      mediaType: postPlan.data.mediaType,
      order: 1,
      total: 1,
    });
    const layout = getComposition(template, "post", compositionId);
    const brandProfile = brandKitToRenderProfile(brandKit);

    // The raw, un-composited source image — never the already-flattened
    // `postMedia.renderedImageUrl` (see pptx-builder.ts's doc comment for
    // why). Mirrors `loadStillImageForCompositing`'s own still-frame
    // selection for a VIDEO asset (poster/thumbnail over the raw file).
    const mediaDataUrl = postMedia.mediaAsset
      ? postMedia.mediaAsset.type === "VIDEO"
        ? (postMedia.mediaAsset.thumbnailUrl ?? postMedia.mediaAsset.url)
        : postMedia.mediaAsset.url
      : null;

    const content: FrameContent = {
      category: postPlan.data.category,
      headline: postPlan.data.headline,
      body: postPlan.data.body,
      cta: postPlan.data.cta,
    };

    let pptxBuffer: Buffer;
    let imported;
    try {
      pptxBuffer = await buildPostPptx({
        layout,
        content,
        mediaDataUrl,
        logoDataUrl: brandProfile.logos.primary ?? null,
        brand: brandProfile,
        brandLabel: brandKit?.name ?? "",
      });

      imported = await importPostDesign(accessToken, pptxBuffer, creation.title);
    } catch (error) {
      await prisma.creation.update({ where: { id }, data: { canvaSyncStatus: "FAILED" } });

      if (error instanceof CanvaApiError) {
        console.error(`[Canva] Design import failed for creation ${id}:`, error);
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
      throw error;
    }

    await prisma.creation.update({
      where: { id },
      data: {
        canvaDesignId: imported.designId,
        canvaEditUrl: imported.editUrl,
        canvaViewUrl: imported.viewUrl,
        canvaSyncStatus: "EDITING",
      },
    });

    return NextResponse.json({ success: true, editUrl: imported.editUrl });
  } catch (error) {
    console.error(`Failed to create Canva design for creation ${id}:`, error);
    return NextResponse.json({ error: "Unable to open this post in Canva right now." }, { status: 500 });
  }
}
