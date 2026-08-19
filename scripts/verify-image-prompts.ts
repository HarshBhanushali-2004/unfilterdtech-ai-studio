/**
 * Local, zero-network verification for the image-prompt-engineering pass
 * (see ABOUT.md). Renders `buildCarouselPlannerPrompt` (the highest-value
 * target — Carousel is the most important format per this pass's brief)
 * against fake Research/Planner objects and prints the resulting prompt
 * string, so the structured "visualDirection" JSON shape and the new
 * per-slide "imageGenerationPrompt" rule can be read and sanity-checked by
 * eye without spending a single Gemini token. Never imports anything that
 * touches `@google/generative-ai`, `fetch`, or Prisma — this only exercises
 * plain string-building functions.
 *
 * Run: node --experimental-transform-types --loader ./scripts/ts-relative-ext-loader.mjs scripts/verify-image-prompts.ts
 */

import { buildCarouselPlannerPrompt } from "../lib/ai/carousel-planner-prompt-builder"
import type { ResearchObject } from "../lib/ai/research-schemas"
import type { PlannerObject } from "../lib/ai/planner-schemas"

const research: ResearchObject = {
  topic: "Tesla Model Y vs BYD Sealion 7",
  summary: "Tesla's Model Y remains the best-selling EV globally, while BYD's Sealion 7 is an aggressive new entrant using LFP Blade Battery tech and targeting emerging markets like India.",
  latestDevelopments: ["BYD Sealion 7 launched in India"],
  keyFacts: ["Tesla Model Y sold 1.2M+ units in 2023", "BYD uses Cell-to-Body Blade Battery architecture"],
  statistics: ["Import tariffs of 70-100% apply to fully imported EVs in India"],
  importantNumbers: ["1.2 million deliveries"],
  benefits: ["Lower cost of ownership"],
  drawbacks: ["High import duties"],
  useCases: ["Daily commuting", "Family SUV use"],
  audience: ["EV shoppers in emerging markets"],
  painPoints: ["Pricing uncertainty", "Charging infrastructure"],
  competitors: ["Tesla", "BYD"],
  keywords: ["EV", "Tesla Model Y", "BYD Sealion 7"],
  entities: ["Tesla", "BYD"],
  relatedTechnologies: ["LFP battery", "800V platform"],
  commonMisconceptions: ["All EVs use the same battery chemistry"],
  ctaIdeas: ["Comment your pick"],
  questionsPeopleAsk: ["Which EV is better for India?"],
  contentAngles: ["Battery architecture comparison"],
  suggestedHooks: ["Tesla vs BYD: the real EV battle"],
  suggestedTitles: ["Tesla Model Y vs BYD Sealion 7"],
  suggestedCarouselTopics: ["Battery tech breakdown"],
  suggestedReelIdeas: ["Quick battery comparison"],
  suggestedStoryIdeas: ["Poll: which EV wins?"],
  suggestedImageIdeas: ["Side-by-side automotive editorial shot"],
  suggestedThumbnailIdeas: ["Split-screen car comparison"],
}

const planner: PlannerObject = {
  targetAudience: "EV-curious professionals in emerging markets",
  audiencePainPoints: ["Confusing pricing", "Battery tech jargon"],
  audienceIntent: "Compare before buying",
  contentObjective: "Educate on battery architecture differences",
  toneRecommendation: "confident, expert",
  emotionalDirection: "curiosity and authority",
  hookStrategy: "open with a bold comparative claim",
  ctaStrategy: "ask for an opinion in the comments",
  storytellingFramework: "comparison narrative",
  marketingAngle: "technical credibility",
  educationalAngle: "battery chemistry 101",
  viralAngle: "brand rivalry",
  suggestedVisualDirection: "premium editorial automotive photography, dark backgrounds, electric blue accents",
  suggestedThumbnailIdea: "Tesla and BYD side by side",
  contentComplexity: "intermediate",
  bestContentLength: "6-8 slides",
  suggestedPostingStrategy: "weekday morning",
  keywordIntelligence: {
    primaryKeywords: ["Tesla Model Y", "BYD Sealion 7"],
    secondaryKeywords: ["EV battery"],
    lsiKeywords: ["electric SUV"],
    semanticKeywords: ["battery chemistry"],
    searchIntent: "comparison",
  },
}

const prompt = buildCarouselPlannerPrompt(
  "Tesla Model Y vs BYD Sealion 7",
  research,
  planner,
  "" // no brand context for this check
)

console.log(prompt)
console.log("\n\n--- length:", prompt.length, "chars ---")
