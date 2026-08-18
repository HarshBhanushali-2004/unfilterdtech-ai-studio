import type { CarouselSlide } from "@/components/creations/carousel-card";
import type { Reel } from "@/components/creations/reel-card";
import type { StoryFrame } from "@/components/creations/story-card";
import type { CarouselPlanObject } from "@/lib/ai/carousel-planner-schemas";
import type { ReelPlanObject } from "@/lib/ai/reel-planner-schemas";
import type { StoryPlanObject } from "@/lib/ai/story-planner-schemas";

/**
 * Adapts a per-format AI Plan's structured content (`CarouselPlan.data`,
 * `StoryPlan.data`, `ReelPlan.data` — see `prisma/schema.prisma`) into the
 * exact shape `CarouselCard`/`StoryCard`/`ReelCard` already render, so the
 * Review page can show a Plan's full text alongside its rendered media
 * gallery without a new "plan text" component or touching those three
 * existing, already-working cards at all.
 *
 * Why this exists: the Plan is the source of truth for a Carousel/Story/
 * Reel's text (CLAUDE.md Section 12c), but until now nothing ever rendered
 * that text as text — only the server-side renderer read it, to bake it
 * into an image. If a slide/frame/scene's media failed, its text was
 * effectively invisible (a "Media unavailable" tile, nothing else) even
 * though the text itself was safely stored the whole time. These adapters
 * are what let the Review page show the Plan's text unconditionally,
 * independent of whether its media succeeded.
 *
 * `Post` has no adapter here — it has no legacy per-field card to reuse
 * (`PostCard` only ever showed the Instagram caption), so its headline/
 * body/cta gets a small new `PostContentCard` instead — see that file.
 */

export function carouselPlanToSlides(plan: CarouselPlanObject): CarouselSlide[] {
  return plan.slides.map((slide) => ({
    slideNumber: slide.order,
    headline: slide.headline,
    body: slide.cta ? [slide.body, `CTA: ${slide.cta}`].filter(Boolean).join("\n\n") : slide.body,
    visualSuggestion: slide.visualIntent,
  }));
}

export function storyPlanToFrames(plan: StoryPlanObject): StoryFrame[] {
  return plan.frames.map((frame) => ({
    frameNumber: frame.order,
    text: [frame.headline, frame.body, frame.cta ? `CTA: ${frame.cta}` : null]
      .filter(Boolean)
      .join("\n\n"),
    visualSuggestion: frame.visualIntent,
  }));
}

export function reelPlanToReel(plan: ReelPlanObject): Reel {
  return {
    hook: plan.hook,
    // ReelPlan has no single monolithic "script" field — each scene's own
    // narration collectively *is* the script (AGENTS.md's adaptive,
    // purpose-driven scene structure) — joined here only for the legacy
    // `Reel.script` field this adapts into.
    script: plan.scenes.map((scene) => scene.narration).filter(Boolean).join("\n\n"),
    scenes: plan.scenes.map((scene) => ({
      sceneNumber: scene.order,
      narration: [
        scene.narration,
        scene.onScreenText ? `On-screen text: ${scene.onScreenText}` : null,
        scene.cta ? `CTA: ${scene.cta}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      visual: scene.imageGenerationPrompt,
    })),
  };
}
