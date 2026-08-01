"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";

type CopyButtonProps = {
  text: string;
  label: string;
  successMessage: string;
  errorMessage?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm";
};

export function CopyButton({
  text,
  label,
  successMessage,
  errorMessage,
  variant,
  size,
}: CopyButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => copyToClipboard(text, successMessage, errorMessage)}
    >
      <Copy className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
