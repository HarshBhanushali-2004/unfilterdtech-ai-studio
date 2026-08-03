import { z } from "zod"

const stringArray = z.array(z.string().trim().min(1))

export const researchObjectSchema = z.object({
  topic: z.string().trim().min(1),
  summary: z.string().trim().min(1),

  latestDevelopments: stringArray,
  keyFacts: stringArray,
  statistics: stringArray,
  importantNumbers: stringArray,

  benefits: stringArray,
  drawbacks: stringArray,
  useCases: stringArray,

  audience: stringArray,
  painPoints: stringArray,
  competitors: stringArray,

  keywords: stringArray,
  entities: stringArray,
  relatedTechnologies: stringArray,
  commonMisconceptions: stringArray,

  ctaIdeas: stringArray,
  questionsPeopleAsk: stringArray,
  contentAngles: stringArray,

  suggestedHooks: stringArray,
  suggestedTitles: stringArray,
  suggestedCarouselTopics: stringArray,
  suggestedReelIdeas: stringArray,
  suggestedStoryIdeas: stringArray,
  suggestedImageIdeas: stringArray,
  suggestedThumbnailIdeas: stringArray,
})

export type ResearchObject = z.infer<typeof researchObjectSchema>

type ResearchListField = Exclude<keyof ResearchObject, "topic" | "summary">

/**
 * Single source of truth for the Research Object's list-shaped fields and
 * their human-readable labels. Shared by the content Prompt Builder (to
 * format research into a grounding block) and the Creation Details UI (to
 * render the Research panel) so the two never drift apart.
 */
export const RESEARCH_LIST_FIELDS: Array<{
  key: ResearchListField
  label: string
}> = [
  { key: "latestDevelopments", label: "Latest Developments" },
  { key: "keyFacts", label: "Key Facts" },
  { key: "statistics", label: "Statistics" },
  { key: "importantNumbers", label: "Important Numbers" },
  { key: "benefits", label: "Benefits" },
  { key: "drawbacks", label: "Drawbacks" },
  { key: "useCases", label: "Use Cases" },
  { key: "audience", label: "Audience" },
  { key: "painPoints", label: "Pain Points" },
  { key: "competitors", label: "Competitors" },
  { key: "keywords", label: "Keywords" },
  { key: "entities", label: "Entities" },
  { key: "relatedTechnologies", label: "Related Technologies" },
  { key: "commonMisconceptions", label: "Common Misconceptions" },
  { key: "ctaIdeas", label: "Call To Action Ideas" },
  { key: "questionsPeopleAsk", label: "Questions People Ask" },
  { key: "contentAngles", label: "Content Angles" },
  { key: "suggestedHooks", label: "Suggested Hooks" },
  { key: "suggestedTitles", label: "Suggested Titles" },
  { key: "suggestedCarouselTopics", label: "Suggested Carousel Topics" },
  { key: "suggestedReelIdeas", label: "Suggested Reel Ideas" },
  { key: "suggestedStoryIdeas", label: "Suggested Story Ideas" },
  { key: "suggestedImageIdeas", label: "Suggested Image Ideas" },
  { key: "suggestedThumbnailIdeas", label: "Suggested Thumbnail Ideas" },
]
