import { imageGenerationPromptRule } from "./image-prompt-guidelines"
import type { PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"

/**
 * Builds the prompt for the Post Planner — Phase 1C's Instagram Single Post
 * content type (see AGENTS.md). One designed visual, not a sequence: the AI
 * decides whether it's built from a generated IMAGE or (architecturally,
 * once a real provider exists) VIDEO, then writes the headline/body/CTA
 * that sit on top of it.
 */
export function buildPostPlannerPrompt(
  topic: string,
  research: ResearchObject,
  planner: PlannerObject,
  brandContext: string
) {
  const strategySummary = `Topic: ${research.topic}
Summary: ${research.summary}
Key Facts: ${research.keyFacts.join("; ")}
Suggested Image Ideas: ${research.suggestedImageIdeas.join("; ")}
Suggested Hooks: ${research.suggestedHooks.join("; ")}

Target Audience: ${planner.targetAudience}
Content Objective: ${planner.contentObjective}
Tone Recommendation: ${planner.toneRecommendation}
Hook Strategy: ${planner.hookStrategy}
CTA Strategy: ${planner.ctaStrategy}
Marketing Angle: ${planner.marketingAngle}
Suggested Visual Direction: ${planner.suggestedVisualDirection}
Primary Keywords: ${planner.keywordIntelligence.primaryKeywords.join(", ")}`

  return `You are a senior social media art director, designing a single Instagram post — one strong, self-contained visual, not a sequence. Using the strategic brief below, decide the single strongest visual concept and write the on-image copy for it.

Original input: "${topic}"

Strategic Brief
---
${strategySummary}
---

${brandContext ? `${brandContext}\n\n` : ""}Return exactly one valid JSON object. Do not include markdown, code fences, commentary, or additional keys. The object must use this exact shape:
{
  "category": "string (short label, e.g. Technology, News, Business, Educational, Product)",
  "mediaType": "IMAGE" | "VIDEO",
  "mediaQuery": "string (a real-world search query describing the ideal source photo/video for this post)",
  "imageGenerationPrompt": "string (see the structured-prompt rule below)",
  "headline": "string (short, punchy — the post's on-screen headline)",
  "body": "string (supporting on-screen copy — may be empty if the headline alone carries the post)",
  "cta": "string (only non-empty if the post should show a call to action)"
}

Rules:
- A single post has to work standing completely alone — no "swipe for more" context. Make the visual concept and headline strong enough to stop a scroll on their own.
- Use VIDEO only when the concept is inherently dynamic/demonstrative and would genuinely benefit from real footage; use IMAGE for a strong static visual otherwise. Even when mediaType is VIDEO, still write a strong "imageGenerationPrompt" and "mediaQuery" — Phase 1 may not always have real source footage available and needs a high-quality fallback.
${imageGenerationPromptRule("4:5")}
- "headline" must be short and punchy (aim for under 10 words) — it's on-screen typography, not a caption (the separate written caption/hashtags are generated elsewhere in this pipeline, not part of this plan).
- Ground the concept in the strategic brief (audience, tone, angle, keywords) and, when brand guidance is provided, reflect the brand's voice and colors — never invent brand facts that weren't given.`
}
