import type { BrandKit } from "@prisma/client"

type BrandContextSource = Pick<
  BrandKit,
  | "name"
  | "industry"
  | "targetAudience"
  | "language"
  | "tone"
  | "writingStyle"
  | "ctaStyle"
  | "emojiStyle"
  | "keywords"
  | "hashtags"
  | "avoidWords"
>

function formatText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function formatList(values: string[] | null | undefined) {
  const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned.join(", ") : undefined
}

/**
 * Converts a Brand Kit into a clean, human-readable prompt section.
 * Fields that are missing/empty are omitted entirely. Returns an empty
 * string when there's no Brand Kit or no populated fields to describe.
 */
export function buildBrandContext(
  brandKit: BrandContextSource | null | undefined
): string {
  if (!brandKit) return ""

  const fields: Array<[label: string, value: string | undefined]> = [
    ["Brand Name", formatText(brandKit.name)],
    ["Industry", formatText(brandKit.industry)],
    ["Target Audience", formatText(brandKit.targetAudience)],
    ["Tone", formatText(brandKit.tone)],
    ["Writing Style", formatText(brandKit.writingStyle)],
    ["Language", formatText(brandKit.language)],
    ["CTA Style", formatText(brandKit.ctaStyle)],
    ["Emoji Style", formatText(brandKit.emojiStyle)],
    ["Preferred Keywords", formatList(brandKit.keywords)],
    ["Preferred Hashtags", formatList(brandKit.hashtags)],
    ["Avoid Words", formatList(brandKit.avoidWords)],
  ]

  const populatedFields = fields.filter(
    (field): field is [string, string] => field[1] !== undefined
  )

  if (populatedFields.length === 0) return ""

  const body = populatedFields
    .map(([label, value]) => `${label}:\n${value}`)
    .join("\n\n")

  return `Brand Guidelines\n\n${body}`
}
