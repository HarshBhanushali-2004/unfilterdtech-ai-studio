"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditProjectDialog } from "./edit-project-dialog";

type EditProjectButtonProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    brandKit?: {
      id: string;
      name: string;
    } | null;
  };
};

export function EditProjectButton({
  project,
}: EditProjectButtonProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Button>

      <EditProjectDialog
        open={open}
        onOpenChange={setOpen}
        project={project}
        onUpdated={() => router.refresh()}
      />
    </>
  );
}