/**
 * Shared prompt-engineering guidance injected into every Planner prompt
 * builder (Carousel/Post/Story/Reel) that asks Gemini to write an
 * `imageGenerationPrompt`. Previously each planner asked for "a complete,
 * standalone AI image generation prompt — subject, composition, lighting,
 * mood, style" with no further structure — a one-line instruction that
 * routinely produced thin, generic prompts ("Create an image about
 * Tesla."-shaped), no shared visual identity across a carousel's slides,
 * no instruction to leave room for the application's own rendered text,
 * and no instruction against generating fake on-image text/watermarks/
 * logos. Centralized here rather than duplicated four times so the
 * standard stays identical across formats and easy to tune in one place.
 */

/** Embedded in a multi-item format's (Carousel/Story/Reel) JSON shape block, directly after `objective`. Indentation matches those prompt builders' existing 2-space JSON blocks. */
export const VISUAL_DIRECTION_JSON_SHAPE = `"visualDirection": {
    "style": "string (overall visual style, e.g. premium editorial technology photography)",
    "realism": "string (e.g. photorealistic, cinematic, illustrative)",
    "lighting": "string (e.g. cinematic controlled lighting, soft natural daylight)",
    "color": "string (the campaign's color language, e.g. deep blacks with electric blue and cyan accents)",
    "mood": "string (e.g. futuristic, premium, authoritative, warm, playful)",
    "composition": "string (a shared compositional approach, e.g. strong subject separation with clean text-safe negative space)",
    "photography": "string (a shared camera/photography style, e.g. editorial technology magazine style)"
  },`

/** A rule-list line instructing the shared campaign direction — one professionally art-directed sequence, not unrelated images. `itemNoun` is "slide" / "frame" / "scene". */
export function visualDirectionRule(itemNoun: string): string {
  return `- Before writing any individual ${itemNoun}'s "imageGenerationPrompt", first decide one shared "visualDirection" for the whole sequence — style, realism, lighting, color, mood, composition, and photography — so every ${itemNoun} reads as one professionally art-directed campaign, not a set of unrelated AI images. Every ${itemNoun}'s own imageGenerationPrompt must apply this same shared direction (the same lighting language, color treatment, camera/photography style, realism level, and mood) while still being a distinct, non-repetitive shot suited to that ${itemNoun}'s own subject — consistency without repetition, never near-duplicate images.`
}

/** A rule-list line specifying exactly what a single `imageGenerationPrompt` must contain, ending in a verbatim negative-constraints + aspect-ratio instruction the image provider actually receives unmodified. `aspectRatio` is "4:5" (Post/Carousel) or "9:16" (Story/Reel). */
export function imageGenerationPromptRule(aspectRatio: string): string {
  return `- Every "imageGenerationPrompt" (whenever a real image is needed) must be a complete, structured, standalone AI image-generation prompt written as connected prose, covering in order: Subject (what/who is actually in frame, grounded in the strategic brief above — never invent facts not given), Visual concept (the specific idea this one shot communicates), Environment (setting/background), Composition (framing, and where the clear negative space for application-rendered text should sit — vary which corner/edge across the sequence rather than reusing the same spot every time), Camera (lens/angle/depth-of-field language), Lighting, Mood, Color direction, and a light Brand direction (a restrained nod to brand identity — never an instruction to render an actual logo, watermark, or brand name as text). End every "imageGenerationPrompt" with this exact sentence, verbatim: "Aspect ratio ${aspectRatio}. Do not render any text, typography, captions, watermarks, logos, or UI elements in the image — the application renders all text separately."`
}
