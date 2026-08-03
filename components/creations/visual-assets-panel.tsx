"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Image as ImageIcon } from "lucide-react";

import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { PromptImageCard } from "@/components/creations/prompt-image-card";
import { carouselSlot } from "@/lib/image-generation/slot-resolver";
import type { GeneratedImageDTO } from "@/lib/image-generation/types";
import type { VisualPromptObject } from "@/lib/ai";

function SpecField({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-6">{value}</p>
    </div>
  );
}

function FormatGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

type VisualAssetsPanelProps = {
  visualPromptId: string;
  visualPrompt: VisualPromptObject;
};

/**
 * Visual Assets panel — production-ready AI image prompts behind a
 * creation, grouped by content format, each individually collapsible with
 * its own copy/edit/generate/download/delete controls (`PromptImageCard`).
 * Loads any previously generated images for this Visual Prompt once on
 * mount so results persist across reloads and are shared across every
 * Creation that reuses the same Visual Prompt (matching the existing
 * Research/Planner/Visual Prompt cache design).
 */
export function VisualAssetsPanel({ visualPromptId, visualPrompt }: VisualAssetsPanelProps) {
  const finalSlide = visualPrompt.carousel.slides.at(-1);

  const [imagesBySlot, setImagesBySlot] = React.useState<Record<string, GeneratedImageDTO>>({});

  React.useEffect(() => {
    let cancelled = false;

    fetch(`/api/visual-prompts/${visualPromptId}/images`)
      .then((response) => response.json())
      .then((json) => {
        if (cancelled || !Array.isArray(json.data)) return;

        const bySlot: Record<string, GeneratedImageDTO> = {};
        for (const image of json.data as GeneratedImageDTO[]) {
          bySlot[image.slot] = image;
        }
        setImagesBySlot(bySlot);
      })
      .catch(() => {
        // Non-fatal — the panel simply renders with no prior images.
      });

    return () => {
      cancelled = true;
    };
  }, [visualPromptId]);

  function handleImageChange(slot: string, image: GeneratedImageDTO | null) {
    setImagesBySlot((prev) => {
      const next = { ...prev };
      if (image) {
        next[slot] = image;
      } else {
        delete next[slot];
      }
      return next;
    });
  }

  return (
    <div className="rounded-2xl border p-5 md:p-6">
      <CollapsibleSection
        title="Visual Assets"
        description="Production-ready AI image prompts behind this generation"
        defaultOpen={false}
        icon={
          <span className="grid size-7 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <ImageIcon className="size-3.5" />
          </span>
        }
      >
        <div className="space-y-8">
          <FormatGroup title="Post">
            <PromptImageCard
              title="Main Image Prompt"
              slot="post.mainImage"
              visualPromptId={visualPromptId}
              prompt={visualPrompt.post.mainImagePrompt}
              image={imagesBySlot["post.mainImage"]}
              onImageChange={handleImageChange}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SpecField label="Layout Recommendation" value={visualPrompt.post.layoutRecommendation} />
              <SpecField label="Typography Recommendation" value={visualPrompt.post.typographyRecommendation} />
              <SpecField label="Visual Hierarchy" value={visualPrompt.post.visualHierarchy} />
              <SpecField label="Design Direction" value={visualPrompt.post.designDirection} />
            </div>
          </FormatGroup>

          <FormatGroup title="Story">
            <PromptImageCard
              title="Background Prompt"
              slot="story.background"
              visualPromptId={visualPromptId}
              prompt={visualPrompt.story.backgroundPrompt}
              image={imagesBySlot["story.background"]}
              onImageChange={handleImageChange}
            />
            <PromptImageCard
              title="Foreground Element Prompt"
              slot="story.foreground"
              visualPromptId={visualPromptId}
              prompt={visualPrompt.story.foregroundElementPrompt}
              image={imagesBySlot["story.foreground"]}
              onImageChange={handleImageChange}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SpecField label="CTA Placement" value={visualPrompt.story.ctaPlacement} />
              <SpecField label="Poll / Question Sticker" value={visualPrompt.story.pollOrQuestionStickerSuggestion} />
              <SpecField label="Swipe-up / Link Placement" value={visualPrompt.story.swipeUpOrLinkPlacement} />
              <SpecField label="Safe Area Recommendation" value={visualPrompt.story.safeAreaRecommendation} />
            </div>
          </FormatGroup>

          <FormatGroup title="Carousel Slide Prompts">
            {visualPrompt.carousel.slides.map((slide) => {
              const slot = carouselSlot(slide.slideNumber);
              return (
                <PromptImageCard
                  key={slide.slideNumber}
                  title={`Slide ${slide.slideNumber}: ${slide.slideTitle}`}
                  slot={slot}
                  visualPromptId={visualPromptId}
                  prompt={slide.imagePrompt}
                  image={imagesBySlot[slot]}
                  onImageChange={handleImageChange}
                />
              );
            })}
            <div className="grid gap-4 sm:grid-cols-2">
              <SpecField label="Content Objective (final slide)" value={finalSlide?.contentObjective ?? ""} />
              <SpecField label="Layout Suggestion (final slide)" value={finalSlide?.layoutSuggestion ?? ""} />
              <SpecField label="Final Slide CTA" value={finalSlide?.cta ?? ""} />
              <SpecField label="Final Slide Branding" value={finalSlide?.branding ?? ""} />
            </div>
          </FormatGroup>

          <FormatGroup title="Reel">
            <div className="grid gap-4 sm:grid-cols-2">
              <SpecField label="Hook" value={visualPrompt.reel.hook} />
              <SpecField label="Estimated Duration" value={visualPrompt.reel.estimatedDuration} />
              <SpecField label="Total Scenes" value={String(visualPrompt.reel.totalScenes)} />
              <SpecField label="Music Mood" value={visualPrompt.reel.musicMood} />
              <SpecField label="Ending CTA" value={visualPrompt.reel.endingCta} />
            </div>
            <PromptImageCard
              title="Thumbnail Prompt"
              slot="reel.thumbnail"
              visualPromptId={visualPromptId}
              prompt={visualPrompt.reel.thumbnailPrompt}
              image={imagesBySlot["reel.thumbnail"]}
              onImageChange={handleImageChange}
            />
            <PromptImageCard
              title="Cover Prompt"
              slot="reel.cover"
              visualPromptId={visualPromptId}
              prompt={visualPrompt.reel.coverPrompt}
              image={imagesBySlot["reel.cover"]}
              onImageChange={handleImageChange}
            />
          </FormatGroup>
        </div>
      </CollapsibleSection>
    </div>
  );
}
