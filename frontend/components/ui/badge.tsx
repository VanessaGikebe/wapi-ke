import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge — small typographic tag. `pill` variants echo the category chips over
 * imagery; `rating` mirrors the star-score block on experience cards.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 font-caption text-caption uppercase tracking-widest",
  {
    variants: {
      variant: {
        solid: "bg-primary text-on-primary",
        accent: "bg-secondary-container text-on-secondary-container",
        subtle: "bg-surface-container-highest text-on-surface",
        outline: "border border-outline-variant text-on-surface-variant",
        glass:
          "border border-surface-container-lowest/30 bg-surface-container-lowest/20 text-on-primary backdrop-blur-sm",
      },
      shape: {
        pill: "rounded-full px-3 py-1",
        chip: "rounded-md px-2 py-1 tracking-wide",
      },
    },
    defaultVariants: {
      variant: "subtle",
      shape: "pill",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, shape, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, shape }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
