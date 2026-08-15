import type { PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"

/**
 * Builds the prompt for the Carousel Planner — Phase 1's AI Carousel Engine
 * (see AGENTS.md). Turns Research + Planner strategy into an adaptive,
 * story-driven carousel: the AI decides slide count, per-slide narrative
 * purpose, and per-slide media type (IMAGE / VIDEO / NO_MEDIA). Runs after
 * the Planner and independently of the Visual Prompt Engine and the
 * Instagram Content Generator — its output is the source of truth for
 * CAROUSEL creations specifically (see `lib/carousel-plan/service.ts`).
 */
export function buildCarouselPlannerPrompt(
  topic: string,
  research: ResearchObject,
  planner: PlannerObject,
  brandContext: string
) {
  const strategySummary = `Topic: ${research.topic}
Summary: ${research.summary}
Key Facts: ${research.keyFacts.join("; ")}
Statistics: ${research.statistics.join("; ")}
Suggested Carousel Topics: ${research.suggestedCarouselTopics.join("; ")}
Suggested Hooks: ${research.suggestedHooks.join("; ")}

Target Audience: ${planner.targetAudience}
Audience Intent: ${planner.audienceIntent}
Content Objective: ${planner.contentObjective}
Tone Recommendation: ${planner.toneRecommendation}
Emotional Direction: ${planner.emotionalDirection}
Hook Strategy: ${planner.hookStrategy}
CTA Strategy: ${planner.ctaStrategy}
Storytelling Framework: ${planner.storytellingFramework}
Marketing Angle: ${planner.marketingAngle}
Content Complexity: ${planner.contentComplexity}
Suggested Visual Direction: ${planner.suggestedVisualDirection}
Primary Keywords: ${planner.keywordIntelligence.primaryKeywords.join(", ")}`

  return `You are a senior social media art director and editorial content strategist, planning an Instagram carousel. Using the strategic brief below, design a complete, adaptive carousel — not a generic list of AI-generated images, but a designed editorial sequence where every slide has a clear narrative job.

Original input: "${topic}"

Strategic Brief
---
${strategySummary}
---

${brandContext ? `${brandContext}\n\n` : ""}Return exactly one valid JSON object. Do not include markdown, code fences, commentary, or additional keys. The object must use this exact shape:
{
  "title": "string",
  "category": "string (short label, e.g. Technology, News, Business, Educational, Product)",
  "objective": "string (what this carousel is trying to achieve)",
  "slideCount": 1,
  "slides": [
    {
      "order": 1,
      "purpose": "string (this slide's editorial role, e.g. Hook, Context, Evidence, Explanation, Insight, CTA — or another structure you judge fits the topic better)",
      "mediaType": "IMAGE" | "VIDEO" | "NO_MEDIA",
      "mediaQuery": "string (a real-world search query describing the ideal source photo/video for this slide — required unless mediaType is NO_MEDIA, otherwise empty string)",
      "imageGenerationPrompt": "string (a complete, standalone AI image generation prompt — subject, composition, lighting, mood, style — required whenever mediaType is IMAGE or VIDEO, otherwise empty string; used as the fallback when no real source video/image is available)",
      "headline": "string (short, punchy — this slide's on-screen headline)",
      "body": "string (supporting on-screen copy — may be empty for a purely visual slide)",
      "cta": "string (only non-empty on a slide that should show a call to action, typically the last slide)",
      "visualIntent": "string (layout/visual direction for this slide — how the media and text should relate)"
    }
  ]
}

Rules:
- Decide the slide count yourself, based on how much the topic genuinely needs to say — do not default to a fixed number. A simple topic might need 3-4 slides; a rich one might need 8-10. slideCount must equal the length of the slides array.
- "order" values must be exactly 1, 2, 3, ... with no gaps, matching each slide's position in the array.
- Every slide must be strategically necessary — never pad with filler slides just to hit a target length.
- Decide "mediaType" per slide independently. Use VIDEO for a moment that's inherently dynamic/demonstrative (a process, a motion, an action) and would genuinely benefit from real footage. Use IMAGE for a slide that needs a strong static visual (a concept, a product, a scene, a portrait, an illustrative moment). Use NO_MEDIA only for a slide that works purely as bold typography (e.g. a short punchy stat, a quote, a transition, a pure-text CTA) — do not overuse NO_MEDIA; most carousels should be predominantly visual.
- Even when mediaType is VIDEO, still write a strong "imageGenerationPrompt" and "mediaQuery" — Phase 1 may not always have real source footage available and needs a high-quality fallback.
- The default editorial progression is Hook → Context → Evidence → Explanation → Insight → CTA, but adapt it freely to what the topic actually needs (a news story, a product, a how-it-works explainer, and a listicle all want different shapes) — use your judgment, not a fixed template.
- The final slide should almost always carry the CTA and reflect the brand/CTA strategy above; earlier slides should have an empty "cta" string.
- "headline" must be short and punchy (aim for under 10 words) — it's on-screen typography, not a caption.
- Ground every slide in the strategic brief (audience, tone, angle, keywords) and, when brand guidance is provided, reflect the brand's voice and colors — never invent brand facts that weren't given.`
}
