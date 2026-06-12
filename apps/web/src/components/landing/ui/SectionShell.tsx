import * as React from "react";

import { cn } from "@/lib/utils";

interface SectionShellProps extends React.HTMLAttributes<HTMLElement> {
  /** Anchor id for nav links. */
  id?: string;
  /** id of the heading that names this section (for aria-labelledby). */
  labelledBy?: string;
  /** Use the raised alt band background. */
  alt?: boolean;
  /** Remove the default top/bottom section padding (for full-bleed bands). */
  flush?: boolean;
  innerClassName?: string;
}

/**
 * Standard section wrapper: alternating canvas band, fluid vertical padding,
 * centered max-w content column. See LANDING_DESIGN.md §3.
 */
export function SectionShell({
  id,
  labelledBy,
  alt = false,
  flush = false,
  className,
  innerClassName,
  children,
  ...props
}: SectionShellProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "relative px-5 md:px-6",
        !flush && "py-[var(--lp-space-section)]",
        alt ? "bg-lp-bg-1" : "bg-lp-bg",
        className,
      )}
      {...props}
    >
      <div className={cn("mx-auto w-full max-w-[1200px]", innerClassName)}>{children}</div>
    </section>
  );
}
