/**
 * Motion infrastructure — DESIGN_SYSTEM.md §4.
 *
 * Performance contract:
 *  - Framer Motion is loaded as ~5KB via LazyMotion + the `domAnimation` feature
 *    bundle (NOT the full ~34KB `motion` import). New code MUST import `m` from here
 *    and use `m.*`, never `motion.*`.
 *  - NOTE: `strict` is intentionally NOT set. Several pre-existing components
 *    (ThemeToggle, DemoBanner, onboarding tour, etc.) still render `motion.*` inside
 *    this provider; `strict` would throw at runtime for those. Once they migrate to
 *    `m.*`, re-enable `strict` here to lock the lightweight bundle in.
 *  - `MotionConfig reducedMotion="user"` honours `prefers-reduced-motion` globally:
 *    transform/position animations collapse to instant, opacity is kept.
 *  - All variants here animate transform/opacity only (compositor-friendly). Nothing
 *    animates width/height/top/left/margin/padding.
 */
import type { ReactNode } from "react";
import {
  LazyMotion,
  domAnimation,
  MotionConfig,
  useReducedMotion,
  useMotionValue,
  animate,
  type Variants,
  type Transition,
} from "framer-motion";
import { useEffect, useState } from "react";

// Re-export `m` so feature code imports the lightweight component from one place.
export { m } from "framer-motion";

/** Motion tokens (§4.2). Durations in seconds. */
export const duration = { fast: 0.15, base: 0.22, slow: 0.32 } as const;

export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number], // expo-out — default
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
} as const;

export const spring = {
  modal: { type: "spring", stiffness: 380, damping: 30, mass: 0.8 } as Transition,
} as const;

/** Page enter — fade + 12px rise (§4.3). */
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
};

/** List / grid stagger container — 50ms between children. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/** Stagger child item. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
};

/**
 * Card hover-lift — GPU transform + shadow, NO layout (§4.3).
 * Spread onto an `m` element: `<m.div {...hoverLift}>`.
 */
export const hoverLift = {
  whileHover: { y: -2 },
  transition: { duration: duration.fast },
} as const;

/** Modal / sheet — spring scale + fade. */
export const modalSpring: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: spring.modal },
  exit: { opacity: 0, scale: 0.97, transition: { duration: duration.fast } },
};

/**
 * App-root motion provider. Wrap once at the top of the tree.
 * `domAnimation` ships the lightweight feature bundle; `reducedMotion="user"`
 * honours prefers-reduced-motion globally.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/**
 * Number count-up (§4.3). Animates a motion value over `value`, returns the current
 * display number. Respects reduced-motion (jumps straight to the final value) and only
 * animates on a meaningful change. Render the result with `tabular-nums`.
 */
export function useCountUp(
  value: number,
  options?: { durationMs?: number; decimals?: number },
): number {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const [display, setDisplay] = useState(value);
  const durationMs = options?.durationMs ?? 700;
  const decimals = options?.decimals ?? 0;

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const factor = Math.pow(10, decimals);
    const controls = animate(motionValue, value, {
      duration: durationMs / 1000,
      ease: ease.out,
      onUpdate: (latest) => setDisplay(Math.round(latest * factor) / factor),
    });
    return () => controls.stop();
  }, [value, reduceMotion, durationMs, decimals, motionValue]);

  return display;
}
