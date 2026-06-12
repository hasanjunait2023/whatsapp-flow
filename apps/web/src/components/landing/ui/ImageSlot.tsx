import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface ImageSlotProps {
  /** Slot name shown in the placeholder, e.g. "HERO_SHOT". */
  name: string;
  /** Human description of what the real asset should contain. */
  hint?: string;
  /** Tailwind aspect class, e.g. "aspect-[16/10]". */
  aspect: string;
  /** Optional browser/phone chrome framing. */
  frame?: "browser" | "phone" | "none";
  className?: string;
}

/**
 * MARKED placeholder for a screenshot/photo that marketing will drop in later.
 * Holds the exact aspect ratio so swapping in the real asset causes zero layout
 * shift. Never renders a broken <img>. See LANDING_DESIGN.md §4.
 *
 * Real asset note: replace this component with an <img loading="lazy" ... /> (or
 * eager + fetchpriority="high" for HERO_SHOT) at the same aspect ratio.
 */
export function ImageSlot({ name, hint, aspect, frame = "none", className }: ImageSlotProps) {
  const body = (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-[var(--lp-r-lg)] border border-dashed border-[var(--lp-border-strong)] bg-lp-surface text-center",
        aspect,
        className,
      )}
    >
      <ImageIcon className="h-7 w-7 text-lp-dim" aria-hidden="true" />
      <span className="px-4 font-mono text-xs uppercase tracking-wider text-lp-dim">{name}</span>
      {hint && <span className="max-w-[28ch] px-4 text-[11px] leading-snug text-lp-dim/80">{hint}</span>}
    </div>
  );

  if (frame === "browser") {
    return (
      <div className="overflow-hidden rounded-[var(--lp-r-lg)] border border-[var(--lp-border)] bg-lp-surface-2 shadow-[var(--lp-shadow-card)]">
        <div className="flex items-center gap-1.5 border-b border-[var(--lp-border)] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/70" />
          <span className="ml-3 h-4 flex-1 rounded-full bg-[var(--lp-surface-glass)]" />
        </div>
        <div className="p-2">{body}</div>
      </div>
    );
  }

  if (frame === "phone") {
    return (
      <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[28px] border-2 border-[var(--lp-border-strong)] bg-lp-surface-2 p-2 shadow-[var(--lp-shadow-card)]">
        <div className="mx-auto mb-2 mt-1 h-1.5 w-16 rounded-full bg-[var(--lp-border-strong)]" />
        <div className="overflow-hidden rounded-[20px]">{body}</div>
      </div>
    );
  }

  return body;
}
