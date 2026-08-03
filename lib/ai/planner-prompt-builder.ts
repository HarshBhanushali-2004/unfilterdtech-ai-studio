import type { ResearchObject } from "./research-schemas"

/**
 * Builds the prompt for the AI Planner — the strategy step between Research
 * and generation. Unlike the Research prompt, this one deliberately DOES
 * take Brand Kit guidance and tone/creativity, since audience framing, hook
 * strategy, and CTA strategy should reflect the brand, not just the topic.
 */
export function buildPlannerPrompt(
  research: ResearchObject,
  brandContext: string,
  tone: string,
  creativity: number
) {
  const researchSummary = `Topic: ${research.topic}\n\nSummary:\n${research.summary}\n\nKey Facts:\n${research.keyFacts.map((fact) => `- ${fact}`).join("\n")}\n\nAudience (from research):\n${research.audience.map((item) => `- ${item}`).join("\n")}\n\nPain Points (from research):\n${research.painPoints.map((item) => `- ${item}`).join("\n")}`

  return `You are a senior content strategist. Using the research brief below, produce a strategic content plan — NOT a caption or any finished copy. Your job is planning and strategy only.

Research Brief
---
${researchSummary}
---

${brandContext ? `${brandContext}\n\n` : ""}Target tone: ${tone}
Creativity level: ${creativity}/100

Return exactly one valid JSON object. Do not include markdown, code fences, commentary, or additional keys. The object must use this exact shape:
{
  "targetAudience": "string",
  "audiencePainPoints": ["string"],
  "audienceIntent": "string",
  "contentObjective": "string",
  "toneRecommendation": "string",
  "emotionalDirection": "string",
  "hookStrategy": "string",
  "ctaStrategy": "string",
  "storytellingFramework": "string",
  "marketingAngle": "string",
  "educationalAngle": "string",
  "viralAngle": "string",
  "suggestedVisualDirection": "string",
  "suggestedThumbnailIdea": "string",
  "contentComplexity": "beginner" | "intermediate" | "expert",
  "bestContentLength": "string",
  "suggestedPostingStrategy": "string",
  "keywordIntelligence": {
    "primaryKeywords": ["string"],
    "secondaryKeywords": ["string"],
    "lsiKeywords": ["string"],
    "semanticKeywords": ["string"],
    "searchIntent": "string"
  }
}

Rules:
- "contentComplexity" must be exactly one of "beginner", "intermediate", or "expert" — pick the level this audience needs.
- Every string field should be a concrete, specific recommendation for this exact topic and audience, not generic advice.
- "keywordIntelligence" should reflect real SEO/discovery strategy: primary = the 2-4 most important terms, secondary = supporting terms, lsi = semantically related terms search engines associate with the topic, semantic = broader concept/entity terms, and "searchIntent" is a one-sentence description of what someone searching this topic wants.
- Do not write any actual captions, hooks, or CTAs verbatim here — describe the strategy for them instead.`
}
