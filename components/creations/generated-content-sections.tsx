"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HashtagsCard } from "@/components/creations/hashtags-card";
import { PostCard } from "@/components/creations/post-card";
import { PostContentCard, type PostPlanContent } from "@/components/creations/post-content-card";
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
   * Content/media separation: the Plan's own structured text —
   * `CarouselPlan.data.slides`/`StoryPlan.data.frames`/`ReelPlan.data`,
   * adapted into the shape `CarouselCard`/`StoryCard`/`ReelCard` already
   * render (see `lib/creations/plan-content-views.ts`), and
   * `PostPlan.data`'s headline/body/cta for `PostContentCard`. Previously,
   * once a Plan existed, its tab showed *only* the rendered media gallery
   * — a failed slide/frame/scene's text was invisible, even though the
   * text itself was safely stored the whole time. Passing it here makes
   * it always render (as a card below the gallery), independent of
   * whether that item's media succeeded. `null`/omitted for a pre-Plan
   * creation, which keeps falling back to the legacy `carousel`/`story`/
   * `reel` props exactly as before.
   */
  carouselPlanSlides?: CarouselSlide[] | null;
  storyPlanFrames?: StoryFrame[] | null;
  reelPlanContent?: Reel | null;
  postPlanContent?: PostPlanContent | null;
  /**
   * Which tabs to show, in order — defaults to all six. The Review page
   * passes a trimmed set (no "Hashtags"/"Post") since those already have
   * their own top-level sections there (see CLAUDE.md Section 12); the
   * Studio's live preview keeps the full default.
   */
  tabs?: readonly TabValue[];
  /**
   * A value that changes whenever this creation's persisted media might
   * have changed server-side (Regenerate, Canva Sync back) — the Review
   * page passes `creation.updatedAt`. Used only as the `key` on the four
   * media-gallery client components below.
   *
   * Why: those galleries fetch their own data once on mount and only poll
   * while a slot is non-terminal (PENDING/RESOLVING/RENDERING) — see
   * `CarouselSlidesGallery`'s doc comment. Once every slot reaches
   * COMPLETED/FAILED, polling stops. `router.refresh()` (what Regenerate/
   * Sync back call after mutating) re-fetches this Server Component's data,
   * but does **not** remount an already-mounted Client Component with the
   * same props — so a gallery that had already gone quiet keeps showing
   * stale media/errors after a successful Regenerate or Sync back, until
   * the next full page load. Changing `key` forces React to tear down and
   * recreate the gallery instead, which re-triggers its fetch. The Studio's
   * live preview (which never mutates a saved creation) omits this prop
   * and keeps its previous behavior.
   */
  mediaRefreshKey?: string;
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
  carouselPlanSlides,
  storyPlanFrames,
  reelPlanContent,
  postPlanContent,
  tabs = ALL_TABS.map((tab) => tab.value),
  mediaRefreshKey,
}: GeneratedContentSectionsProps) {
  const activeTabs = ALL_TABS.filter((tab) => tabs.includes(tab.value));

  // Prefer the Plan's own text when it exists — it's the source of truth
  // (CLAUDE.md Section 12c) — falling back to the legacy flat field only
  // for a pre-Plan creation. Never a mix of the two.
  const carouselTextSlides = carouselPlanSlides && carouselPlanSlides.length > 0 ? carouselPlanSlides : carousel;
  const storyTextFrames = storyPlanFrames && storyPlanFrames.length > 0 ? storyPlanFrames : story;
  const reelContent = reelPlanContent ?? reel;
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
            {postPlanId && <PostMediaPreview key={mediaRefreshKey} postPlanId={postPlanId} />}
            {postPlanContent && <PostContentCard content={postPlanContent} />}
            <PostCard caption={caption} hashtags={hashtags} />
          </TabsContent>

          <TabsContent value="carousel" className="mt-0 space-y-6">
            {carouselPlanId && (
              <CarouselSlidesGallery
                key={mediaRefreshKey}
                carouselPlanId={carouselPlanId}
                slideCount={carouselTextSlides?.length ?? 4}
              />
            )}
            {carouselTextSlides && carouselTextSlides.length > 0 ? (
              <CarouselCard slides={carouselTextSlides} />
            ) : (
              !carouselPlanId && <EmptyTab label="carousel slides" />
            )}
          </TabsContent>

          <TabsContent value="stories" className="mt-0 space-y-6">
            {storyPlanId && (
              <StoryFramesGallery
                key={mediaRefreshKey}
                storyPlanId={storyPlanId}
                frameCount={storyTextFrames?.length ?? 4}
              />
            )}
            {storyTextFrames && storyTextFrames.length > 0 ? (
              <StoryCard stories={storyTextFrames} />
            ) : (
              !storyPlanId && <EmptyTab label="story frames" />
            )}
          </TabsContent>

          <TabsContent value="reel" className="mt-0 space-y-4">
            {reelPlanId && (
              <ReelScenesGallery
                key={mediaRefreshKey}
                reelPlanId={reelPlanId}
                sceneCount={reelContent?.scenes.length ?? 5}
              />
            )}
            {reelContent ? <ReelCard reel={reelContent} /> : !reelPlanId && <EmptyTab label="reel content" />}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
