"use client";

import { Globe, Palette } from "lucide-react";
import { useState } from "react";

import { BrandKitActions } from "./brand-kit-actions";
import { EditBrandDialog } from "./edit-brand-dialog";

import { deleteBrandKit } from "@/lib/brand-kit/actions";

type BrandKitCardProps = {
  brand: {
    id: string;
    name: string;
    industry: string | null;
    website: string | null;

    description: string | null;
    targetAudience: string | null;
    language: string | null;

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

  onUpdated: () => void;
};

export function BrandKitCard({
  brand,
  onUpdated,
}: BrandKitCardProps) {
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    await deleteBrandKit(brand.id);
    onUpdated();
  }

  return (
    <>
      <div className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {brand.name}
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              {brand.industry || "No industry"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              {[brand.primaryColor, brand.secondaryColor, brand.accentColor]
                .filter(Boolean)
                .map((color, index) => (
                  <div
                    key={index}
                    className="h-5 w-5 rounded-full border"
                    style={{
                      backgroundColor: color!,
                    }}
                  />
                ))}
            </div>

            <BrandKitActions
              onEdit={() => setOpen(true)}
              onDelete={handleDelete}
            />
          </div>
        </div>

        {brand.website && (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="truncate">
              {brand.website}
            </span>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Palette className="h-4 w-4" />
          Brand Kit
        </div>
      </div>
      <EditBrandDialog
        open={open}
        onOpenChange={setOpen}
        brand={brand}
        onUpdated={onUpdated}
      />
    </>
  );
}