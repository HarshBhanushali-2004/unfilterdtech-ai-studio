import type { PlannerObject } from "./planner-schemas"
import type { ResearchObject } from "./research-schemas"

const IMAGE_PROMPT_SHAPE = `{
    "subject": "string",
    "composition": "string",
    "framing": "string",
    "cameraAngle": "string",
    "lensSuggestion": "string",
    "lighting": "string",
    "colorPalette": "string",
    "environment": "string",
    "mood": "string",
    "cinematicStyle": "string",
    "renderingStyle": "string",
    "typographyGuidance": "string",
    "negativePrompt": "string",
    "aspectRatio": "string",
    "qualityKeywords": ["string"],
    "fullPrompt": "string"
  }`

/**
 * Builds the prompt for the Visual Prompt Engine — the step that turns
 * Research + Planner strategy into production-ready AI image/video prompts.
 * Runs independently of the Instagram Content Generator; its output is
 * never fed into the caption/hashtag prompt (Feature 5).
 */
export function buildVisualPromptPrompt(
  research: ResearchObject,
  planner: PlannerObject,
  brandContext: string
) {
  const strategySummary = `Topic: ${research.topic}
Summary: ${research.summary}

Target Audience: ${planner.targetAudience}
Tone Recommendation: ${planner.toneRecommendation}
Emotional Direction: ${planner.emotionalDirection}
Marketing Angle: ${planner.marketingAngle}
Viral Angle: ${planner.viralAngle}
Content Complexity: ${planner.contentComplexity}
Suggested Visual Direction: ${planner.suggestedVisualDirection}
Suggested Thumbnail Idea: ${planner.suggestedThumbnailIdea}
Primary Keywords: ${planner.keywordIntelligence.primaryKeywords.join(", ")}`

  return `You are a world-class AI art director and prompt engineer. Using the strategic brief below, write production-ready prompts for AI image generation models (Gemini Image, Imagen, FLUX, Stable Diffusion, DALL-E, Midjourney, and similar). These prompts will be used directly by a designer without manual editing — they must be specific, vivid, and technically complete, never generic.

Strategic Brief
---
${strategySummary}
---

${brandContext ? `${brandContext}\n\n` : ""}Return exactly one valid JSON object. Do not include markdown, code fences, commentary, or additional keys. The object must use this exact shape:
{
  "post": {
    "mainImagePrompt": ${IMAGE_PROMPT_SHAPE},
    "layoutRecommendation": "string",
    "typographyRecommendation": "string",
    "visualHierarchy": "string",
    "designDirection": "string"
  },
  "story": {
    "backgroundPrompt": ${IMAGE_PROMPT_SHAPE},
    "foregroundElementPrompt": ${IMAGE_PROMPT_SHAPE},
    "ctaPlacement": "string",
    "pollOrQuestionStickerSuggestion": "string",
    "swipeUpOrLinkPlacement": "string",
    "safeAreaRecommendation": "string"
  },
  "carousel": {
    "slides": [
      {
        "slideNumber": 1,
        "slideTitle": "string",
        "contentObjective": "string",
        "visualIdea": "string",
        "imagePrompt": ${IMAGE_PROMPT_SHAPE},
        "layoutSuggestion": "string",
        "cta": "string",
        "branding": "string"
      }
    ]
  },
  "reel": {
    "hook": "string",
    "estimatedDuration": "string",
    "totalScenes": 1,
    "scenes": [
      {
        "sceneNumber": 1,
        "cameraMovement": "string",
        "transitionSuggestion": "string",
        "bRollIdeas": ["string"],
        "voiceoverScript": "string",
        "subtitleScript": "string",
        "onScreenText": "string"
      }
    ],
    "musicMood": "string",
    "endingCta": "string",
    "thumbnailPrompt": ${IMAGE_PROMPT_SHAPE},
    "coverPrompt": ${IMAGE_PROMPT_SHAPE}
  }
}

Rules:
- Populate every field for every format (post, story, carousel, reel), even though only one format may end up being used — this mirrors how the content generator always populates every format.
- Every "fullPrompt" field must be a complete, standalone, production-quality prompt of approximately 250-600 words, written in flowing descriptive prose (not just a keyword list), explicitly covering subject, composition, framing, camera angle, lens, lighting, color palette, environment, mood, cinematic style, rendering style, typography guidance (when relevant), and quality keywords, ending with the negative prompt and aspect ratio clearly labeled.
- "negativePrompt" must always be a real, specific negative prompt (e.g. what to exclude: blurriness, extra limbs, watermarks, clutter, off-brand colors) — never leave it generic or empty.
- "typographyGuidance" may be an empty string only when the image genuinely has no on-image text (e.g. a pure background photo).
- "aspectRatio" must be a concrete ratio appropriate to the placement (e.g. "1:1" for a feed post, "9:16" for a Story/Reel/thumbnail).
- The carousel should have 4-8 slides. Only the LAST slide should have non-empty "cta" and "branding"; all earlier slides must use empty strings "" for both.
- Reel "totalScenes" must equal the length of the "scenes" array (typically 3-7 scenes).
- Every prompt must be intelligently grounded in the strategic brief above (audience, tone, angle, keywords) and, when brand guidance is provided, reflect the brand's colors, style, and voice — but never invent brand facts that weren't given.`
}
