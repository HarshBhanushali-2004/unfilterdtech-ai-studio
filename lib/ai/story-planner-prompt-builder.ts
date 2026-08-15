import type { PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"

/**
 * Builds the prompt for the Story Planner — Phase 1C's Instagram Story
 * content type (see AGENTS.md). Produces a coherent frame sequence (not
 * independent random images), adaptive in count, each frame with its own
 * media decision. Mirrors `buildCarouselPlannerPrompt`'s structure closely
 * — the two formats plan almost identically, differing mainly in framing
 * (a Story is ephemeral, tapped-through fast, and must respect Instagram's
 * top/bottom safe zones the template already reserves).
 */
export function buildStoryPlannerPrompt(
  topic: string,
  research: ResearchObject,
  planner: PlannerObject,
  brandContext: string
) {
  const strategySummary = `Topic: ${research.topic}
Summary: ${research.summary}
Key Facts: ${research.keyFacts.join("; ")}
Suggested Story Ideas: ${research.suggestedStoryIdeas.join("; ")}
Suggested Hooks: ${research.suggestedHooks.join("; ")}

Target Audience: ${planner.targetAudience}
Audience Intent: ${planner.audienceIntent}
Content Objective: ${planner.contentObjective}
Tone Recommendation: ${planner.toneRecommendation}
Hook Strategy: ${planner.hookStrategy}
CTA Strategy: ${planner.ctaStrategy}
Suggested Visual Direction: ${planner.suggestedVisualDirection}
Primary Keywords: ${planner.keywordIntelligence.primaryKeywords.join(", ")}`

  return `You are a senior social media art director, planning an Instagram Story — a fast-tapped, ephemeral sequence of full-screen frames, not a carousel someone browses slowly. Using the strategic brief below, design a complete, coherent frame sequence that tells one story, not a set of independent images.

Original input: "${topic}"

Strategic Brief
---
${strategySummary}
---

${brandContext ? `${brandContext}\n\n` : ""}Return exactly one valid JSON object. Do not include markdown, code fences, commentary, or additional keys. The object must use this exact shape:
{
  "title": "string",
  "category": "string (short label, e.g. Technology, News, Business, Educational, Product)",
  "objective": "string (what this story is trying to achieve)",
  "frameCount": 1,
  "frames": [
    {
      "order": 1,
      "purpose": "string (this frame's narrative role, e.g. Hook, Main Information, Interesting Detail, CTA — or another structure you judge fits the topic better)",
      "mediaType": "IMAGE" | "VIDEO" | "NO_MEDIA",
      "mediaQuery": "string (a real-world search query describing the ideal source photo/video for this frame — required unless mediaType is NO_MEDIA, otherwise empty string)",
      "imageGenerationPrompt": "string (a complete, standalone AI image generation prompt — required whenever mediaType is IMAGE or VIDEO, otherwise empty string; used as the fallback when no real source video/image is available)",
      "headline": "string (short, punchy — this frame's on-screen headline)",
      "body": "string (supporting on-screen copy — may be empty for a purely visual frame)",
      "cta": "string (only non-empty on a frame that should show a call to action, typically the last frame)",
      "visualIntent": "string (layout/visual direction for this frame)"
    }
  ]
}

Rules:
- Decide the frame count yourself based on how much the topic genuinely needs to say — a Story is consumed in seconds per frame, so favor fewer, punchier frames over a long sequence. 3-6 frames is typical; frameCount must equal the length of the frames array.
- "order" values must be exactly 1, 2, 3, ... with no gaps.
- A common shape is Hook → Main Information → Interesting Detail → CTA, but adapt it freely to the topic.
- Every frame's headline/body must be short enough to read in a couple of seconds — this is not carousel copy.
- The final frame should almost always carry the CTA and reflect the brand/CTA strategy above.
- Even when mediaType is VIDEO, still write a strong "imageGenerationPrompt" and "mediaQuery" — a fallback may be needed.
- Use NO_MEDIA sparingly, only for a frame that works purely as bold typography (a short stat, a quote, a transition).
- Ground every frame in the strategic brief (audience, tone, angle, keywords) and, when brand guidance is provided, reflect the brand's voice and colors.`
}
