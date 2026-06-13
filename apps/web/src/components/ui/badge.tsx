import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        info: "border-transparent bg-info text-info-foreground",
        // Finexy status pills — soft tinted background + solid status text (the calm, readable look).
        "success-soft": "border-transparent bg-success-soft text-success",
        "warning-soft": "border-transparent bg-warning-soft text-warning",
        "info-soft": "border-transparent bg-info-soft text-info",
        "destructive-soft": "border-transparent bg-destructive-soft text-destructive",
        "neutral-soft": "border-transparent bg-muted-soft text-muted-foreground",
        brand: "border-transparent bg-brand text-brand-foreground",
        whatsapp: "border-transparent bg-whatsapp text-whatsapp-foreground",
        pulse: "border-transparent bg-primary text-primary-foreground animate-pulse-ring",
        gradient: "border-0 gradient-brand text-primary-foreground shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
