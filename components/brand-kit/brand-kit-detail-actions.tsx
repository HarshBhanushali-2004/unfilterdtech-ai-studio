"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { BrandKit } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditBrandDialog } from "@/components/brand-kit/edit-brand-dialog";
import { deleteBrandKit } from "@/lib/brand-kit/actions";

type BrandKitDetailActionsProps = {
  brand: BrandKit;
};

const actionButtonClass = "h-9 gap-2 rounded-lg px-3.5";

export function BrandKitDetailActions({ brand }: BrandKitDetailActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteBrandKit(brand.id);
        toast.success("Brand Kit deleted");
        router.push("/brand-kit");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete Brand Kit"
        );
        setDeleteOpen(false);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className={actionButtonClass}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>

        <Button
          variant="destructive"
          className={actionButtonClass}
          onClick={() => setDeleteOpen(true)}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <EditBrandDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        brand={brand}
        onUpdated={() => router.refresh()}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Brand Kit?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Any projects linked to it will keep their
              creations but lose the brand association.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
