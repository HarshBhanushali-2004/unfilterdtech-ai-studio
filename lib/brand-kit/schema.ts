import { z } from "zod";

import {
  ICON_STYLES,
  LAYOUT_STYLES,
  LOGO_POSITIONS,
  RENDERER_FONTS,
  TEXT_STYLES,
} from "@/lib/creative-renderer/types";

const stringArray = z.array(z.string()).default([]);

/** Logos are stored as data URLs (no object storage configured — same pattern as GeneratedImage.imageUrl), so a strict `.url()` check would reject them; this only guards against obviously-wrong values. */
const logoField = z
  .string()
  .trim()
  .refine((value) => value === "" || value.startsWith("data:image/") || value.startsWith("http"), {
    message: "Logo must be an uploaded image or a valid URL.",
  })
  .optional()
  .or(z.literal(""));

export const BrandKitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Brand name must be at least 2 characters.")
    .max(100),

  website: z
    .string()
    .trim()
    .url("Invalid website URL.")
    .optional()
    .or(z.literal("")),

  industry: z.string().trim().optional(),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  targetAudience: z.string().trim().optional(),

  language: z.string().trim().default("English"),

  tone: z.string().trim().optional(),

  writingStyle: z.string().trim().optional(),

  emojiStyle: z.string().trim().optional(),

  ctaStyle: z.string().trim().optional(),

  logoUrl: logoField,
  secondaryLogoUrl: logoField,
  whiteLogoUrl: logoField,
  darkLogoUrl: logoField,
  watermarkLogoUrl: logoField,
  watermarkEnabled: z.boolean().default(false),

  logoPosition: z.enum(LOGO_POSITIONS).default("bottom-right"),
  safeMargin: z.coerce.number().int().min(0).max(20).default(5),

  headingFont: z.enum(RENDERER_FONTS).default("Inter"),
  bodyFont: z.enum(RENDERER_FONTS).default("Inter"),

  overlayOpacity: z.coerce.number().int().min(0).max(100).default(45),
  textStyle: z.enum(TEXT_STYLES).default("bold"),
  layoutStyle: z.enum(LAYOUT_STYLES).default("bottom-aligned"),
  iconStyle: z.enum(ICON_STYLES).default("outline"),

  primaryColor: z.string().trim().optional(),

  secondaryColor: z.string().trim().optional(),

  accentColor: z.string().trim().optional(),

  keywords: stringArray,

  hashtags: stringArray,

  avoidWords: stringArray,
});

export const CreateBrandKitSchema = BrandKitSchema;

export const UpdateBrandKitSchema = BrandKitSchema.partial();

export type CreateBrandKitValues = z.infer<typeof CreateBrandKitSchema>;

export type UpdateBrandKitValues = z.infer<typeof UpdateBrandKitSchema>;