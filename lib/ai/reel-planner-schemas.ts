import { z } from "zod"

import { visualDirectionSchema } from "./visual-direction-schema"

const nonEmptyText = z.string().trim().min(1)
const looseText = z.string().trim()

/**
 * Reel media is IMAGE or VIDEO only — never NO_MEDIA (AGENTS.md: "The Reel
 * planner should produce a scene/shot plan" of visual scenes; a reel scene
 * with no visual at all isn't a scene). Phase 1C renders every scene as a
 * static storyboard preview regardless of this value — there is no video
 * composition in this phase (see `ReelPlan`'s Prisma doc comment) — but the
 * decision is still planned and persisted so a future video pipeline can
 * use it without a schema change.
 */
export const reelSceneMediaTypes = ["IMAGE", "VIDEO"] as const

/**
 * One scene of a Reel Plan — Phase 1C's Instagram Reel content type (see
 * AGENTS.md). Adds `durationSeconds` and `narration`/`onScreenText` beyond
 * `StoryPlanFrame`'s shape — a Reel scene is a timed shot, not a tapped
 * frame.
 */
export const reelSceneSchema = z.object({
  order: z.number().int().positive(),
  /** This scene's narrative role, e.g. "Hook", "Explanation", "Detail", "CTA" — free text, the AI may adapt the structure to the topic. */
  purpose: nonEmptyText,
  mediaType: z.enum(reelSceneMediaTypes),
  mediaQuery: nonEmptyText,
  /** Always required — every scene renders a static storyboard preview from this, regardless of mediaType (see the type's doc comment). */
  imageGenerationPrompt: nonEmptyText,
  /** Whole seconds — a planning estimate, not an enforced render duration (no video composition exists yet). */
  durationSeconds: z.number().int().positive().max(60),
  /** What's said in voiceover/dialogue for this scene, if anything. Empty string for a silent/text-only scene. */
  narration: looseText,
  /** Short on-screen caption text for this scene — shown in the storyboard preview's headline element. */
  onScreenText: nonEmptyText,
  cta: looseText,
})

export type ReelPlanScene = z.infer<typeof reelSceneSchema>

/**
 * The Reel Planner's full output — a scene/shot breakdown, not a final
 * video (AGENTS.md: "Phase 1C should focus on the correct architecture and
 * generation pipeline," not composition). `data` on `ReelPlan` (see
 * `prisma/schema.prisma`).
 */
export const reelPlanObjectSchema = z
  .object({
    title: nonEmptyText,
    category: nonEmptyText,
    objective: nonEmptyText,
    hook: nonEmptyText,
    musicMood: nonEmptyText,
    /** Shared visual campaign direction (see `visual-direction-schema.ts`) — optional for backward compatibility with plans cached before this field existed. */
    visualDirection: visualDirectionSchema.optional(),
    sceneCount: z.number().int().positive(),
    scenes: z.array(reelSceneSchema).min(1),
  })
  .refine((plan) => plan.sceneCount === plan.scenes.length, {
    message: "sceneCount must equal the number of scenes",
    path: ["sceneCount"],
  })
  .refine((plan) => plan.scenes.every((scene, index) => scene.order === index + 1), {
    message: "scene order values must be a contiguous 1..N sequence",
    path: ["scenes"],
  })

export type ReelPlanObject = z.infer<typeof reelPlanObjectSchema>
