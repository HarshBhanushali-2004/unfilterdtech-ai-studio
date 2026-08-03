"use client";

import { useRef } from "react";
import { ImageOff, Upload } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ICON_STYLES,
  LAYOUT_STYLES,
  LOGO_POSITIONS,
  RENDERER_FONTS,
  TEXT_STYLES,
} from "@/lib/creative-renderer";

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
  secondaryLogoUrl: string;
  whiteLogoUrl: string;
  darkLogoUrl: string;
  watermarkLogoUrl: string;
  watermarkEnabled: boolean;

  logoPosition: string;
  safeMargin: string;

  headingFont: string;
  bodyFont: string;

  overlayOpacity: string;
  textStyle: string;
  layoutStyle: string;
  iconStyle: string;

  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  keywords: string;
  hashtags: string;
  avoidWords: string;
};

type FieldValue = string | boolean;

type Props = {
  values: BrandKitFormValues;
  onChange: (
    field: keyof BrandKitFormValues,
    value: FieldValue
  ) => void;
};

const LOGO_POSITION_LABELS: Record<string, string> = {
  "top-left": "Top Left",
  "top-right": "Top Right",
  "bottom-left": "Bottom Left",
  "bottom-right": "Bottom Right",
  center: "Center",
};

const TEXT_STYLE_LABELS: Record<string, string> = {
  bold: "Bold",
  elegant: "Elegant",
  minimal: "Minimal",
  playful: "Playful",
};

const LAYOUT_STYLE_LABELS: Record<string, string> = {
  "bottom-aligned": "Bottom Aligned",
  centered: "Centered",
  split: "Split",
  minimal: "Minimal",
};

const ICON_STYLE_LABELS: Record<string, string> = {
  outline: "Outline",
  filled: "Filled",
  duotone: "Duotone",
};

function LogoUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="flex items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/40">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="size-full object-contain" />
          ) : (
            <ImageOff className="size-5 text-muted-foreground" />
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

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
              placeholder="e.g. Shop Now, Learn More"
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

      {/* Logos */}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Logos
        </h3>

        <p className="text-sm text-muted-foreground">
          Used by the Creative Renderer to brand generated images. Uploads are stored directly with your Brand Kit.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <LogoUploadField
            label="Primary Logo"
            value={values.logoUrl}
            onChange={(value) => onChange("logoUrl", value)}
          />

          <LogoUploadField
            label="Secondary Logo"
            value={values.secondaryLogoUrl}
            onChange={(value) => onChange("secondaryLogoUrl", value)}
          />

          <LogoUploadField
            label="White Logo"
            value={values.whiteLogoUrl}
            onChange={(value) => onChange("whiteLogoUrl", value)}
          />

          <LogoUploadField
            label="Dark Logo"
            value={values.darkLogoUrl}
            onChange={(value) => onChange("darkLogoUrl", value)}
          />

          <LogoUploadField
            label="Watermark Logo"
            value={values.watermarkLogoUrl}
            onChange={(value) => onChange("watermarkLogoUrl", value)}
          />

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Enable Watermark</p>
              <p className="text-xs text-muted-foreground">Adds a subtle watermark to rendered creatives.</p>
            </div>

            <Switch
              checked={values.watermarkEnabled}
              onCheckedChange={(checked) => onChange("watermarkEnabled", checked)}
            />
          </div>
        </div>
      </div>

      {/* Creative Renderer */}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Creative Renderer
        </h3>

        <p className="text-sm text-muted-foreground">
          Defaults used when turning a generated image into a branded, Instagram-ready creative.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Preferred Logo Position</Label>

            <Select
              value={values.logoPosition}
              onValueChange={(value) => onChange("logoPosition", value)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOGO_POSITIONS.map((position) => (
                  <SelectItem key={position} value={position}>
                    {LOGO_POSITION_LABELS[position]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Heading Font</Label>

            <Select
              value={values.headingFont}
              onValueChange={(value) => onChange("headingFont", value)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RENDERER_FONTS.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Body Font</Label>

            <Select
              value={values.bodyFont}
              onValueChange={(value) => onChange("bodyFont", value)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RENDERER_FONTS.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Text Style</Label>

            <Select
              value={values.textStyle}
              onValueChange={(value) => onChange("textStyle", value)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_STYLES.map((style) => (
                  <SelectItem key={style} value={style}>
                    {TEXT_STYLE_LABELS[style]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Layout Style</Label>

            <Select
              value={values.layoutStyle}
              onValueChange={(value) => onChange("layoutStyle", value)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_STYLES.map((style) => (
                  <SelectItem key={style} value={style}>
                    {LAYOUT_STYLE_LABELS[style]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Icon Style</Label>

            <Select
              value={values.iconStyle}
              onValueChange={(value) => onChange("iconStyle", value)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_STYLES.map((style) => (
                  <SelectItem key={style} value={style}>
                    {ICON_STYLE_LABELS[style]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Safe Margin</Label>
              <span className="text-sm text-muted-foreground">{values.safeMargin}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={values.safeMargin}
              onChange={(e) => onChange("safeMargin", e.target.value)}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Overlay Opacity</Label>
              <span className="text-sm text-muted-foreground">{values.overlayOpacity}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={values.overlayOpacity}
              onChange={(e) => onChange("overlayOpacity", e.target.value)}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
