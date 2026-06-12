import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Landing-page button. Three variants only:
 *  - primary  : violet brand CTA (the personality)
 *  - ghost    : outline / secondary
 *  - whatsapp : green success action (used sparingly — never alongside a violet CTA)
 *
 * A control is violet OR green, never both. See LANDING_DESIGN.md §1.3.
 */
const lpButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all [transition-duration:var(--lp-dur)] focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "rounded-[var(--lp-r-md)] bg-lp-violet-500 text-white hover:bg-lp-violet-600 hover:shadow-[var(--lp-glow-violet)]",
        ghost:
          "rounded-[var(--lp-r-md)] border border-[var(--lp-border-strong)] bg-transparent text-lp-text hover:bg-lp-surface-2 hover:border-[var(--lp-border-strong)]",
        whatsapp:
          "rounded-[var(--lp-r-md)] bg-lp-green-500 text-[#04130a] hover:bg-lp-green-600 hover:shadow-[var(--lp-glow-green)]",
      },
      size: {
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        pill: "h-11 rounded-[var(--lp-r-pill)] px-5 text-sm",
        icon: "h-12 w-12 rounded-[var(--lp-r-md)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "lg",
    },
  },
);

export interface LpButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof lpButtonVariants> {
  asChild?: boolean;
}

export const LpButton = React.forwardRef<HTMLButtonElement, LpButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(lpButtonVariants({ variant, size }), className)} {...props} />;
  },
);
LpButton.displayName = "LpButton";

export { lpButtonVariants };
