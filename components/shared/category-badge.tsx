import { cn } from "@/lib/utils";
import { CATEGORY_CONFIG } from "@/lib/constants";
import type { ApplicationCategory } from "@/lib/types";

interface CategoryBadgeProps {
  category: ApplicationCategory;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        config.bg,
        config.color,
        config.border,
        className
      )}
    >
      {config.label}
    </span>
  );
}
