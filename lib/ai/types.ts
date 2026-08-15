export const sourceTypes = ["topic", "text", "url"] as const
export const contentTypes = ["instagram_post", "carousel", "story", "reel"] as const

export type AISourceType = (typeof sourceTypes)[number]
export type AIContentType = (typeof contentTypes)[number]

export type CarouselSlide = {
  slideNumber: number
  headline: string
  body: string
  visualSuggestion: string
}

export type StoryFrame = {
  frameNumber: number
  text: string
  visualSuggestion: string
}

export type ReelScene = {
  sceneNumber: number
  visual: string
  narration: string
}

export type ReelContent = {
  hook: string
  script: string
  scenes: ReelScene[]
}

export type GeneratedInstagramContent = {
  caption: string
  hashtags: string[]
  carousel: CarouselSlide[]
  story: StoryFrame[]
  reel: ReelContent
}

export type GenerateContentInput = {
  sourceType: AISourceType
  input: string
  contentTypes: AIContentType[]
  tone: string
  creativity: number
  projectId?: string
  /** Reuse a previously generated research brief instead of the topic cache lookup. */
  researchId?: string
  /** Reuse a previously generated strategic plan instead of the planner cache lookup. */
  plannerId?: string
  /** Reuse a previously generated visual prompt set instead of the visual prompt cache lookup. */
  visualPromptId?: string
  /** Reuse a previously generated carousel plan instead of the carousel plan cache lookup. Only meaningful when contentTypes includes "carousel" — see Phase 1's AI Carousel Engine (AGENTS.md). */
  carouselPlanId?: string
  /** Reuse a previously generated post plan instead of the post plan cache lookup. Only meaningful when contentTypes includes "instagram_post" — see Phase 1C (AGENTS.md). */
  postPlanId?: string
  /** Reuse a previously generated story plan instead of the story plan cache lookup. Only meaningful when contentTypes includes "story" — see Phase 1C (AGENTS.md). */
  storyPlanId?: string
  /** Reuse a previously generated reel plan instead of the reel plan cache lookup. Only meaningful when contentTypes includes "reel" — see Phase 1C (AGENTS.md). */
  reelPlanId?: string
}
