"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
};

export function CollapsibleSection({
  title,
  description,
  icon,
  defaultOpen = false,
  children,
  className,
  headerClassName,
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={contentId}
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left",
          headerClassName
        )}
      >
        <span className="flex items-center gap-2">
          {icon}
          <span>
            <span className="block text-sm font-semibold">{title}</span>
            {description && (
              <span className="block text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </span>
        </span>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div id={contentId} className="mt-6">
          {children}
        </div>
      )}
    </div>
  );
}
