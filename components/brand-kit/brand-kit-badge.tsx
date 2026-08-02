import { Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BrandKitBadgeProps = {
  name: string;
  className?: string;
};

export function BrandKitBadge({ name, className }: BrandKitBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-violet-200 bg-violet-500/5 text-violet-700 dark:border-violet-900 dark:bg-violet-500/10 dark:text-violet-300",
        className
      )}
    >
      <Tag className="size-3" />
      {name}
    </Badge>
  );
}
