"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Palette, Plus } from "lucide-react";
import type { BrandKit } from "@prisma/client";

import { CreateBrandDialog } from "./create-brand-dialog";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandKitCard } from "./brand-kit-card";

type Props = {
  brandKits: BrandKit[];
};

export function BrandKitPageClient({
  brandKits,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Brand Kit"
        description="Give AI the guardrails it needs to make every creation feel on-brand."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Brand
          </Button>
        }
      />

      <div className="mt-9">
        {brandKits.length === 0 ? (
          <EmptyState
            icon={Palette}
            title="Build your brand foundation"
            description="Add your logo, colors, typography, tone of voice, hashtags, and brand rules."
            action={
              <Button
                variant="outline"
                onClick={() => setOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Brand Kit
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {brandKits.map((brand) => (
              <BrandKitCard
                key={brand.id}
                brand={brand}
                onUpdated={() => router.refresh()}
              />
            ))}
          </div>
        )}
      </div>

      <CreateBrandDialog
        open={open}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}