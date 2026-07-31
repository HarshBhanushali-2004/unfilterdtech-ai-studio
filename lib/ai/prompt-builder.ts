import type { GenerateContentInput } from "./types"

const sourceLabels = {
  topic: "topic",
  text: "source text",
  url: "reference URL",
} as const

export function buildInstagramContentPrompt(
  { sourceType, input, contentTypes, tone, creativity }: GenerateContentInput,
  brandContext?: string
) {
  const requestedFormats = contentTypes.join(", ")

  const prompt = `You are a senior social media strategist for Instagram. Create original, useful, brand-safe content using the provided source material.

Source type: ${sourceLabels[sourceType]}
Source material:
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
