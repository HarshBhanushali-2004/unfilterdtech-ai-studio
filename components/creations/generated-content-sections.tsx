"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HashtagsCard } from "@/components/creations/hashtags-card";
import { PostCard } from "@/components/creations/post-card";
import { CaptionCard } from "@/components/creations/caption-card";
import { CarouselCard, type CarouselSlide } from "@/components/creations/carousel-card";
import { CarouselSlidesGallery } from "@/components/creations/carousel-slides-gallery";
import { PostMediaPreview } from "@/components/creations/post-media-preview";
import { StoryCard, type StoryFrame } from "@/components/creations/story-card";
import { StoryFramesGallery } from "@/components/creations/story-frames-gallery";
import { ReelCard, type Reel } from "@/components/creations/reel-card";
import { ReelScenesGallery } from "@/components/creations/reel-scenes-gallery";

const ALL_TABS = [
  { value: "caption", label: "Caption" },
  { value: "hashtags", label: "Hashtags" },
  { value: "post", label: "Post" },
  { value: "carousel", label: "Carousel" },
  { value: "stories", label: "Stories" },
  { value: "reel", label: "Reel" },
] as const;

type TabValue = (typeof ALL_TABS)[number]["value"];

type GeneratedContentSectionsProps = {
  caption: string;
  hashtags: string[];
  carousel?: CarouselSlide[] | null;
  story?: StoryFrame[] | null;
  reel?: Reel | null;
  /**
   * Phase 1's AI Carousel Engine (see AGENTS.md) — when set, the "Carousel"
   * tab shows the rendered slide gallery (template + media + Brand Kit)
   * instead of the legacy plain-text `carousel` slides above. Creations
   * saved before this feature (or any non-carousel content type) leave
   * this unset and keep rendering `carousel` exactly as before.
   */
  carouselPlanId?: string | null;
  /** Phase 1C (see AGENTS.md) — when set, the "Post" tab shows the rendered post image above the caption/hashtags mockup, the same "swap in the visual result when a plan exists" pattern as `carouselPlanId`. */
  postPlanId?: string | null;
  /** Phase 1C (see AGENTS.md) — when set, the "Stories" tab shows the rendered frame gallery instead of the legacy plain-text `story` frames, the same pattern as `carouselPlanId`. */
  storyPlanId?: string | null;
  /** Phase 1C (see AGENTS.md) — when set, the "Reel" tab shows the scene storyboard preview (static images, honestly labeled — no video composition exists) above the legacy text script, the same pattern as `carouselPlanId`. */
  reelPlanId?: string | null;
  /**
   * Which tabs to show, in order — defaults to all six. The Review page
   * passes a trimmed set (no "Hashtags"/"Post") since those already have
   * their own top-level sections there (see CLAUDE.md Section 12); the
   * Studio's live preview keeps the full default.
   */
  tabs?: readonly TabValue[];
};

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      No {label} generated for this format.
    </div>
  );
}

/**
 * Shared "Caption → Hashtags → Post → Carousel → Stories → Reel" tabbed view.
 * Used by both the Creation Details page and the AI Studio live preview so
 * the two surfaces never drift apart. Only the active tab is rendered.
 */
export function GeneratedContentSections({
  caption,
  hashtags,
  carousel,
  story,
  reel,
  carouselPlanId,
  postPlanId,
  storyPlanId,
  reelPlanId,
  tabs = ALL_TABS.map((tab) => tab.value),
}: GeneratedContentSectionsProps) {
  const activeTabs = ALL_TABS.filter((tab) => tabs.includes(tab.value));
  const [activeTab, setActiveTab] = React.useState<string>(activeTabs[0]?.value ?? "caption");

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto border-b px-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-4 sm:overflow-x-visible [&::-webkit-scrollbar]:hidden">
          <TabsList
            variant="line"
            className="h-11 w-max min-w-full justify-start gap-1 sm:grid sm:w-full sm:gap-2"
            style={{ gridTemplateColumns: `repeat(${activeTabs.length}, minmax(0, 1fr))` }}
          >
            {activeTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="shrink-0 px-3 text-center data-[state=active]:text-violet-600 data-[state=active]:after:bg-violet-600 dark:data-[state=active]:text-violet-300 dark:data-[state=active]:after:bg-violet-400"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="p-5 md:p-6">
          <TabsContent value="caption" className="mt-0">
            <CaptionCard caption={caption} />
          </TabsContent>

          <TabsContent value="hashtags" className="mt-0">
            {hashtags.length > 0 ? (
              <HashtagsCard hashtags={hashtags} />
            ) : (
              <EmptyTab label="hashtags" />
            )}
          </TabsContent>

          <TabsContent value="post" className="mt-0 space-y-4">
            {postPlanId && <PostMediaPreview postPlanId={postPlanId} />}
            <PostCard caption={caption} hashtags={hashtags} />
          </TabsContent>

          <TabsContent value="carousel" className="mt-0">
            {carouselPlanId ? (
              <CarouselSlidesGallery carouselPlanId={carouselPlanId} slideCount={carousel?.length ?? 4} />
            ) : carousel && carousel.length > 0 ? (
              <CarouselCard slides={carousel} />
            ) : (
              <EmptyTab label="carousel slides" />
            )}
          </TabsContent>

          <TabsContent value="stories" className="mt-0">
            {storyPlanId ? (
              <StoryFramesGallery storyPlanId={storyPlanId} frameCount={story?.length ?? 4} />
            ) : story && story.length > 0 ? (
              <StoryCard stories={story} />
            ) : (
              <EmptyTab label="story frames" />
            )}
          </TabsContent>

          <TabsContent value="reel" className="mt-0 space-y-4">
            {reelPlanId && (
              <ReelScenesGallery reelPlanId={reelPlanId} sceneCount={reel?.scenes.length ?? 5} />
            )}
            {reel ? <ReelCard reel={reel} /> : !reelPlanId && <EmptyTab label="reel content" />}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
