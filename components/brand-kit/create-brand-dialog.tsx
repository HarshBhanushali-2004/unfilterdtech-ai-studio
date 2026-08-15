"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createBrandKit } from "@/lib/brand-kit/actions";

import {
  BrandKitForm,
  type BrandKitFormValues,
} from "./brand-kit-form";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

const initialValues: BrandKitFormValues = {
  name: "",
  website: "",
  industry: "",
  description: "",

  targetAudience: "",
  language: "English",

  tone: "",
  writingStyle: "",
  emojiStyle: "",
  ctaStyle: "",

  logoUrl: "",
  secondaryLogoUrl: "",
  whiteLogoUrl: "",
  darkLogoUrl: "",
  watermarkLogoUrl: "",
  watermarkEnabled: false,

  logoPosition: "bottom-right",
  safeMargin: "5",

  headingFont: "Inter",
  bodyFont: "Inter",

  overlayOpacity: "45",
  textStyle: "bold",
  layoutStyle: "bottom-aligned",
  iconStyle: "outline",

  primaryColor: "#7C3AED",
  secondaryColor: "#2563EB",
  accentColor: "#EC4899",

  templateFamilyId: "editorial-tech",

  keywords: "",
  hashtags: "",
  avoidWords: "",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateBrandDialog({
  open,
  onOpenChange,
}: Props) {
  const [values, setValues] =
    useState<BrandKitFormValues>(initialValues);

  const [isPending, startTransition] =
    useTransition();

  function updateField(
    field: keyof BrandKitFormValues,
    value: string | boolean
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function reset() {
    setValues(initialValues);
  }

    function save() {
      startTransition(async () => {
        try {
          await createBrandKit({
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

          toast.success("Brand Kit created");

          reset();
          onOpenChange(false);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to create Brand Kit."
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
            Create Brand Kit
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
              : "Create Brand Kit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}