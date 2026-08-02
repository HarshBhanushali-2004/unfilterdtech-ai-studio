"use client";

import Link from "next/link";
import { ArrowUpRight, Globe, Palette } from "lucide-react";
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
      <div className="group flex flex-col rounded-2xl border bg-card p-7 transition-all hover:border-primary/40 hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <Link
            href={`/brand-kit/${brand.id}`}
            className="min-w-0 space-y-1.5"
          >
            <h3 className="truncate text-lg font-semibold leading-tight transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-300">
              {brand.name}
            </h3>

            <p className="text-sm text-muted-foreground">
              {brand.industry || "No industry"}
            </p>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <div className="flex gap-1.5">
              {[brand.primaryColor, brand.secondaryColor, brand.accentColor]
                .filter(Boolean)
                .map((color, index) => (
                  <div
                    key={index}
                    className="h-5 w-5 rounded-full border shadow-sm"
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

        {brand.description && (
          <p className="mt-5 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {brand.description}
          </p>
        )}

        {brand.website && (
          <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {brand.website}
            </span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t pt-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Palette className="h-4 w-4" />
            Brand Kit
          </div>

          <Link
            href={`/brand-kit/${brand.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200"
          >
            View
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
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
