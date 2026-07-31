"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type BrandKitFormValues = {
  name: string;
  website: string;
  industry: string;
  description: string;

  targetAudience: string;
  language: string;

  tone: string;
  writingStyle: string;
  emojiStyle: string;
  ctaStyle: string;

  logoUrl: string;

  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  keywords: string;
  hashtags: string;
  avoidWords: string;
};

type Props = {
  values: BrandKitFormValues;
  onChange: (
    field: keyof BrandKitFormValues,
    value: string
  ) => void;
};

export function BrandKitForm({
  values,
  onChange,
}: Props) {
  return (
    <div className="space-y-8">
      {/* Basic Information */}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Basic Information
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Brand Name *</Label>

            <Input
              value={values.name}
              onChange={(e) =>
                onChange("name", e.target.value)
              }
              placeholder="Nike"
            />
          </div>

          <div className="space-y-2">
            <Label>Website</Label>

            <Input
              value={values.website}
              onChange={(e) =>
                onChange("website", e.target.value)
              }
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Industry</Label>

            <Input
              value={values.industry}
              onChange={(e) =>
                onChange("industry", e.target.value)
              }
              placeholder="Fitness"
            />
          </div>

          <div className="space-y-2">
            <Label>Language</Label>

            <Input
              value={values.language}
              onChange={(e) =>
                onChange("language", e.target.value)
              }
              placeholder="English"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>

          <Textarea
            rows={4}
            value={values.description}
            onChange={(e) =>
              onChange("description", e.target.value)
            }
            placeholder="Describe your brand..."
          />
        </div>
      </div>

      {/* Brand Voice */}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Brand Voice
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Target Audience</Label>

            <Input
              value={values.targetAudience}
              onChange={(e) =>
                onChange(
                  "targetAudience",
                  e.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Tone</Label>

            <Input
              value={values.tone}
              onChange={(e) =>
                onChange("tone", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Writing Style</Label>

            <Input
              value={values.writingStyle}
              onChange={(e) =>
                onChange(
                  "writingStyle",
                  e.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label>CTA Style</Label>

            <Input
              value={values.ctaStyle}
              onChange={(e) =>
                onChange("ctaStyle", e.target.value)
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Emoji Style</Label>

            <Input
              value={values.emojiStyle}
              onChange={(e) =>
                onChange(
                  "emojiStyle",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </div>

      {/* Branding */}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Branding
        </h3>

        <div className="space-y-2">
          <Label>Logo URL</Label>

          <Input
            value={values.logoUrl}
            onChange={(e) =>
              onChange("logoUrl", e.target.value)
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Primary Color</Label>

            <Input
              type="color"
              value={values.primaryColor}
              onChange={(e) =>
                onChange(
                  "primaryColor",
                  e.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Secondary Color</Label>

            <Input
              type="color"
              value={values.secondaryColor}
              onChange={(e) =>
                onChange(
                  "secondaryColor",
                  e.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Accent Color</Label>

            <Input
              type="color"
              value={values.accentColor}
              onChange={(e) =>
                onChange(
                  "accentColor",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </div>

      {/* AI Guidance */}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          AI Guidance
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Keywords (comma separated)
            </Label>

            <Textarea
              rows={2}
              value={values.keywords}
              onChange={(e) =>
                onChange(
                  "keywords",
                  e.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              Hashtags (comma separated)
            </Label>

            <Textarea
              rows={2}
              value={values.hashtags}
              onChange={(e) =>
                onChange(
                  "hashtags",
                  e.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              Avoid Words (comma separated)
            </Label>

            <Textarea
              rows={2}
              value={values.avoidWords}
              onChange={(e) =>
                onChange(
                  "avoidWords",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}