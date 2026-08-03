export type EvaluationContent = {
  caption: string
  hashtags: string[]
}

/**
 * Builds the prompt for the post-generation AI Quality Score + AI Suggestions
 * evaluation. Runs once per saved creation against the finished content —
 * never mutates it, and never triggers regeneration on its own.
 */
export function buildEvaluationPrompt(
  content: EvaluationContent,
  brandContext: string
) {
  const hashtagsLine = content.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")

  return `You are a senior social media performance auditor. Score the finished content below and suggest concrete improvements. Do not rewrite it — only evaluate it.

Caption:
---
${content.caption}
---

Hashtags:
---
${hashtagsLine || "(none)"}
---

${brandContext ? `${brandContext}\n\n` : ""}Return exactly one valid JSON object. Do not include markdown, code fences, commentary, or additional keys. The object must use this exact shape:
{
  "scores": {
    "overall": 0,
    "hook": 0,
    "clarity": 0,
    "engagement": 0,
    "virality": 0,
    "readability": 0,
    "educationalValue": 0,
    "brandAlignment": 0,
    "ctaQuality": 0,
    "confidence": 0
  },
  "suggestions": [
    { "label": "string", "detail": "string" }
  ]
}

Rules:
- Every score is an integer from 0 to 100. "overall" should reflect a holistic weighting of the other scores, not a simple average.
- "brandAlignment" should score how well the content matches the brand guidance above; if no brand guidance was given, score based on general professionalism and consistency instead.
- "confidence" reflects how confident you are in this evaluation given the information available.
- Provide 3 to 6 "suggestions". Each "label" should be a short actionable phrase (e.g. "Improve Hook", "Increase Curiosity", "Make More Professional", "Target Developers", "Increase Saves") and "detail" one sentence explaining why/how.
- Suggestions are recommendations only — never include instructions to auto-apply, auto-regenerate, or replace the content.`
}
