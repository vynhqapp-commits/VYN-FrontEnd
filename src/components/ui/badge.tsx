import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--elite-orange)] text-white",
        secondary: "border-transparent bg-[var(--elite-card-2)] text-[var(--elite-text)]",
        outline: "border-[var(--elite-border-2)] text-[var(--elite-text)]",
        success: "border-transparent bg-[var(--elite-green-dim)] text-[var(--elite-green)]",
        warning: "border-transparent bg-[var(--elite-yellow-dim)] text-[var(--elite-yellow)]",
        destructive: "border-transparent bg-[var(--elite-red-dim)] text-[var(--elite-red)]",
        muted: "border-transparent bg-[var(--elite-card-2)] text-[var(--elite-muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

