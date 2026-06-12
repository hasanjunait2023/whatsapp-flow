import { cn } from "@/lib/utils";

interface GlowBackdropProps {
  /** Show the faint dot grid layer. */
  grid?: boolean;
  /** Animate the main orb drift (auto-disabled under reduced motion via CSS). */
  drift?: boolean;
  className?: string;
}

/**
 * Decorative background layer: a faint dot grid masked to fade at the edges plus
 * a large violet radial orb. Purely atmospheric — always aria-hidden. The single
 * most important "premium" cue per LANDING_DESIGN.md §3.2.
 */
export function GlowBackdrop({ grid = true, drift = false, className }: GlowBackdropProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {grid && (
        <div
          className="lp-dot-grid absolute inset-0"
          style={{
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
          }}
        />
      )}
      {/* Primary top-center violet orb */}
      <div
        className={cn(
          "absolute left-1/2 top-[-25%] h-[60vw] max-h-[640px] w-[120%] max-w-[1200px] rounded-full",
          drift && "lp-orb",
        )}
        style={{
          transform: "translateX(-50%)",
          background:
            "radial-gradient(circle at center, rgba(124,58,237,0.28) 0%, rgba(124,58,237,0.10) 35%, transparent 70%)",
        }}
      />
      {/* Secondary smaller orb, bottom-right */}
      <div
        className="absolute bottom-[-10%] right-[-5%] h-[40vw] max-h-[420px] w-[40vw] max-w-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(139,92,246,0.16) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
