import { z } from "zod";

const stringArray = z.array(z.string()).default([]);

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

  logoUrl: z
    .string()
    .trim()
    .url("Invalid logo URL.")
    .optional()
    .or(z.literal("")),

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