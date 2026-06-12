import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Small landing-page primitives: surface card, eyebrow label, glass pill, stat
 * chip. All resolve against the `.lp` tokens (see src/styles/landing.css).
 */

/** Glassy surface card with hairline border + inset top highlight. */
export function LpCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-[var(--lp-r-lg)] border border-[var(--lp-border)] bg-lp-surface p-6 shadow-[var(--lp-shadow-card)] md:p-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Uppercase tracked eyebrow, violet by default. */
export function Eyebrow({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.12em] text-lp-violet-400",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/** Translucent rounded pill used for hero eyebrow + small badges. */
export function GlassPill({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--lp-r-pill)] border border-[var(--lp-border)] bg-[var(--lp-surface-glass)] px-3 py-1 text-xs text-lp-muted backdrop-blur-xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface StatChipProps {
  value: string;
  label: string;
  /** Marks the figure as a marketing placeholder (dashed border + helper title). */
  placeholder?: boolean;
}

/** Big-number + label glass chip for the hero stat row. */
export function StatChip({ value, label, placeholder }: StatChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-baseline gap-2 rounded-[var(--lp-r-pill)] border bg-[var(--lp-surface-glass)] px-4 py-2 backdrop-blur-xl",
        placeholder ? "border-dashed border-[var(--lp-border-strong)]" : "border-[var(--lp-border)]",
      )}
      title={placeholder ? "Placeholder stat — confirm with marketing" : undefined}
    >
      <span className="lp-tnum text-base font-bold text-lp-text">{value}</span>
      <span className="text-xs text-lp-dim">{label}</span>
    </div>
  );
}

/** Small green "live"/online dot with a pulse (success signal). */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)} aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lp-green-400 opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-lp-green-400" />
    </span>
  );
}
