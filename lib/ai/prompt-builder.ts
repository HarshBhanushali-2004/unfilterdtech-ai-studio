import { PLANNER_TEXT_FIELDS, type PlannerObject } from "./planner-schemas"
import { RESEARCH_LIST_FIELDS, type ResearchObject } from "./research-schemas"
import type { GenerateContentInput } from "./types"

const sourceLabels = {
  topic: "topic",
  text: "source text",
  url: "reference URL",
} as const

/**
 * Formats a Research Object into a readable grounding block for the content
 * prompt. Purely factual — brand voice/tone/CTA framing is layered on
 * separately via `brandContext`, never mixed into this block.
 */
function buildResearchContext(research: ResearchObject): string {
  const sections = [`Topic: ${research.topic}`, `Summary:\n${research.summary}`]

  for (const { key, label } of RESEARCH_LIST_FIELDS) {
    const values = research[key]
    if (values.length === 0) continue
    sections.push(`${label}:\n${values.map((value) => `- ${value}`).join("\n")}`)
  }

  return `Structured Research Brief (treat as verified background knowledge)\n\n${sections.join("\n\n")}`
}

/**
 * Formats a Planner Object into a strategy block for the content prompt —
 * the AI Planner's whole purpose is to shape how the content gets written
 * (audience, hooks, CTA, angle, complexity), so this feeds directly in.
 */
function buildPlannerContext(planner: PlannerObject): string {
  const sections = [`Content Complexity: ${planner.contentComplexity}`]

  if (planner.audiencePainPoints.length > 0) {
    sections.push(
      `Audience Pain Points:\n${planner.audiencePainPoints.map((item) => `- ${item}`).join("\n")}`
    )
  }

  for (const { key, label } of PLANNER_TEXT_FIELDS) {
    sections.push(`${label}: ${planner[key]}`)
  }

  if (planner.keywordIntelligence.primaryKeywords.length > 0) {
    sections.push(
      `Primary Keywords to weave in naturally: ${planner.keywordIntelligence.primaryKeywords.join(", ")}`
    )
  }

  return `Strategic Content Plan (follow this direction)\n\n${sections.join("\n\n")}`
}

export function buildInstagramContentPrompt(
  { sourceType, input, contentTypes, tone, creativity }: GenerateContentInput,
  research: ResearchObject,
  planner: PlannerObject,
  brandContext?: string
) {
  const requestedFormats = contentTypes.join(", ")
  const researchContext = buildResearchContext(research)
  const plannerContext = buildPlannerContext(planner)

  const prompt = `You are a senior social media strategist for Instagram. Create original, useful, brand-safe content grounded in the structured research brief below, and follow the strategic content plan for audience, hooks, angle, and CTA direction — draw on their facts and strategy rather than inventing new claims or ignoring the plan.

${researchContext}

${plannerContext}

Source type: ${sourceLabels[sourceType]}
Original source material:
---
${input}
---

Requested content formats: ${requestedFormats}
Tone: ${tone}
Creativity level: ${creativity}/100

Return exactly one valid JSON object. Do not include markdown, code fences, commentary, or additional keys. The object must use this exact shape:
{
  "caption": "string",
  "hashtags": ["string"],
  "carousel": [
    {
      "slideNumber": 1,
      "headline": "string",
      "body": "string",
      "visualSuggestion": "string"
    }
  ],
  "story": [
    {
      "frameNumber": 1,
      "text": "string",
      "visualSuggestion": "string"
    }
  ],
  "reel": {
    "hook": "string",
    "script": "string",
    "scenes": [
      {
        "sceneNumber": 1,
        "visual": "string",
        "narration": "string"
      }
    ]
  }
}

Populate every field, including formats that were not explicitly requested. Keep captions concise, make hashtags relevant and without duplicate entries, and number slides, frames, and scenes sequentially starting at 1.`

  return brandContext ? `${brandContext}\n\n${prompt}` : prompt
}
