import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface RevealProps {
  children: React.ReactNode;
  /** Stagger delay in seconds. */
  delay?: number;
  className?: string;
  as?: "div" | "li";
}

/**
 * Fade + small rise on scroll into view, once. Respects prefers-reduced-motion:
 * when reduced, content appears immediately with no transform.
 */
export function Reveal({ children, delay = 0, className, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = as === "li" ? motion.li : motion.div;

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </MotionTag>
  );
}
