"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateBrandKit } from "@/lib/brand-kit/actions";

import {
  BrandKitForm,
  type BrandKitFormValues,
} from "./brand-kit-form";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;

  brand: {
    id: string;

    name: string;
    website: string | null;
    industry: string | null;
    description: string | null;

    targetAudience: string | null;
    language: string |null;

    tone: string | null;
    writingStyle: string | null;
    emojiStyle: string | null;
    ctaStyle: string | null;

    logoUrl: string | null;

    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;

    keywords: string[];
    hashtags: string[];
    avoidWords: string[];
  };
};

function buildValues(
  brand: Props["brand"]
): BrandKitFormValues {
  return {
    name: brand.name,
    website: brand.website ?? "",
    industry: brand.industry ?? "",
    description: brand.description ?? "",

    targetAudience: brand.targetAudience ?? "",
    language: brand.language ?? "English",

    tone: brand.tone ?? "",
    writingStyle: brand.writingStyle ?? "",
    emojiStyle: brand.emojiStyle ?? "",
    ctaStyle: brand.ctaStyle ?? "",

    logoUrl: brand.logoUrl ?? "",

    primaryColor: brand.primaryColor ?? "#7C3AED",
    secondaryColor: brand.secondaryColor ?? "#2563EB",
    accentColor: brand.accentColor ?? "#EC4899",

    keywords: brand.keywords.join(", "),
    hashtags: brand.hashtags.join(", "),
    avoidWords: brand.avoidWords.join(", "),
  };
}

export function EditBrandDialog({
  open,
  onOpenChange,
  onUpdated,
  brand,
}: Props) {
  const [values, setValues] = useState(() =>
    buildValues(brand)
  );

  const [isPending, startTransition] =
    useTransition();

  function updateField(
    field: keyof BrandKitFormValues,
    value: string
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function save() {
    startTransition(async () => {
      try {
        await updateBrandKit(brand.id, {
          ...values,

          keywords: values.keywords
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),

          hashtags: values.hashtags
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),

          avoidWords: values.avoidWords
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        });

        toast.success("Brand Kit updated");

        onUpdated();
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to update Brand Kit."
        );
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Edit Brand Kit
          </DialogTitle>
        </DialogHeader>

        <BrandKitForm
          values={values}
          onChange={updateField}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={save}
            disabled={isPending}
          >
            {isPending
              ? "Saving..."
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}