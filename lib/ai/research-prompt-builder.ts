/**
 * Builds the prompt for the Research Engine's synthesis step. Deliberately
 * brand-agnostic — no tone, audience, or CTA framing belongs here. Brand Kit
 * guidance is layered on later, in the content Prompt Builder.
 */
export function buildResearchPrompt(topic: string, context: string[] = []) {
  const contextBlock =
    context.length > 0
      ? `\n\nAdditional context gathered from external sources:\n---\n${context.join("\n---\n")}\n---\n`
      : ""

  return `You are a meticulous research analyst preparing a structured knowledge brief that other writers will use as their factual foundation.

Topic / source material:
---
${topic}
---
${contextBlock}
Return exactly one valid JSON object. Do not include markdown, code fences, commentary, or additional keys. The object must use this exact shape (every key required; use an empty array "[]" for a section that is genuinely not applicable rather than inventing content):
{
  "topic": "string",
  "summary": "string",
  "latestDevelopments": ["string"],
  "keyFacts": ["string"],
  "statistics": ["string"],
  "importantNumbers": ["string"],
  "benefits": ["string"],
  "drawbacks": ["string"],
  "useCases": ["string"],
  "audience": ["string"],
  "painPoints": ["string"],
  "competitors": ["string"],
  "keywords": ["string"],
  "entities": ["string"],
  "relatedTechnologies": ["string"],
  "commonMisconceptions": ["string"],
  "ctaIdeas": ["string"],
  "questionsPeopleAsk": ["string"],
  "contentAngles": ["string"],
  "suggestedHooks": ["string"],
  "suggestedTitles": ["string"],
  "suggestedCarouselTopics": ["string"],
  "suggestedReelIdeas": ["string"],
  "suggestedStoryIdeas": ["string"],
  "suggestedImageIdeas": ["string"],
  "suggestedThumbnailIdeas": ["string"]
}

Rules:
- Base every fact, statistic, and number strictly on well-established, verifiable knowledge about the topic. Never invent a statistic or figure — omit it instead.
- Keep this brief factual and neutral. Do not apply any particular brand voice, tone, or target-audience framing — that happens in a later step.
- Every populated array should contain concrete entries specific to this topic, not generic filler.
- "audience" describes plausible audience segments interested in this topic (not a brand's specific target audience).`
}
