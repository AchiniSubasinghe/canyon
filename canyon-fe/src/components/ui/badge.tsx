import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium font-mono",
  {
    variants: {
      variant: {
        solid: "border-primary bg-primary text-primary-foreground",
        outline: "border-primary/40 bg-card text-primary",
        muted: "border-border bg-secondary text-muted-foreground",
        default: "border-primary bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };