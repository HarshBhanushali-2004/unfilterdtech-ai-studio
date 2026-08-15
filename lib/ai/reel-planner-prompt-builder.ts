import type { PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"

/**
 * Builds the prompt for the Reel Planner — Phase 1C's Instagram Reel
 * content type (see AGENTS.md). Produces a scene/shot breakdown with
 * timing and narration, not a final video — there is no video composition
 * in this phase (see `lib/reel-plan/`).
 */
export function buildReelPlannerPrompt(
  topic: string,
  research: ResearchObject,
  planner: PlannerObject,
  brandContext: string
) {
  const strategySummary = `Topic: ${research.topic}
Summary: ${research.summary}
Key Facts: ${research.keyFacts.join("; ")}
Suggested Reel Ideas: ${research.suggestedReelIdeas.join("; ")}
Suggested Hooks: ${research.suggestedHooks.join("; ")}

Target Audience: ${planner.targetAudience}
Audience Intent: ${planner.audienceIntent}
Content Objective: ${planner.contentObjective}
Tone Recommendation: ${planner.toneRecommendation}
Hook Strategy: ${planner.hookStrategy}
CTA Strategy: ${planner.ctaStrategy}
Suggested Visual Direction: ${planner.suggestedVisualDirection}
Primary Keywords: ${planner.keywordIntelligence.primaryKeywords.join(", ")}`

  return `You are a senior short-form video director, planning an Instagram Reel — a fast-paced, scene-by-scene video, not a sequence of static slides. Using the strategic brief below, design a complete shot list: every scene's purpose, visual, timing, and what's said or shown on screen.

Original input: "${topic}"

Strategic Brief
---
${strategySummary}
---

${brandContext ? `${brandContext}\n\n` : ""}Return exactly one valid JSON object. Do not include markdown, code fences, commentary, or additional keys. The object must use this exact shape:
{
  "title": "string",
  "category": "string (short label, e.g. Technology, News, Business, Educational, Product)",
  "objective": "string (what this reel is trying to achieve)",
  "hook": "string (the opening line/moment that stops the scroll in the first 1-2 seconds)",
  "musicMood": "string (a creative direction for the soundtrack, e.g. cinematic, energetic, futuristic, emotional, calm, suspense, technology, news, motivational — never name a specific song or claim it is trending)",
  "sceneCount": 1,
  "scenes": [
    {
      "order": 1,
      "purpose": "string (this scene's narrative role, e.g. Hook, Explanation, Detail, CTA — or another structure you judge fits the topic better)",
      "mediaType": "IMAGE" | "VIDEO",
      "mediaQuery": "string (a real-world search query describing the ideal source footage/photo for this scene)",
      "imageGenerationPrompt": "string (a complete, standalone AI image generation prompt — subject, composition, lighting, mood, style — used for this scene's storyboard preview)",
      "durationSeconds": 1,
      "narration": "string (voiceover/dialogue for this scene — empty string for a silent/text-only scene)",
      "onScreenText": "string (short on-screen caption for this scene, a few words)",
      "cta": "string (only non-empty on a scene that should show a call to action, typically the last scene)"
    }
  ]
}

Rules:
- Decide the scene count yourself based on the topic — typical short reels run 15-30 seconds total across 4-8 scenes; keep each scene's "durationSeconds" realistic (1-6 seconds is typical) and make the sum roughly match a coherent total runtime.
- "order" values must be exactly 1, 2, 3, ... with no gaps; sceneCount must equal the length of the scenes array.
- Every scene needs a real visual purpose — this becomes a storyboard preview image (via imageGenerationPrompt), never leave it generic or empty.
- "onScreenText" must be very short — a few words a viewer can read in under a second.
- The final scene should almost always carry the CTA and reflect the brand/CTA strategy above.
- Ground every scene in the strategic brief (audience, tone, angle, keywords) and, when brand guidance is provided, reflect the brand's voice and colors.`
}
