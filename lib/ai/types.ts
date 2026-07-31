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
}
