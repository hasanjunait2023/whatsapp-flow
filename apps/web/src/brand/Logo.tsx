/**
 * Ecomex Logo React Component
 *
 * Variants:
 *  - "mark"      → rounded-square violet badge with icon (canonical)
 *  - "horizontal"→ icon + wordmark side-by-side
 *  - "vertical"  → icon above wordmark
 *
 * Animations via CSS in brand.css:
 *  - .ecx-motion     → rise + scale on mount
 *  - .ecx-reveal     → shimmer mask sweep
 *  - :hover          → lift + glow
 */

import { type CSSProperties } from "react";

interface LogoProps {
  variant?: "mark" | "horizontal" | "vertical";
  size?: number;
  className?: string;
  style?: CSSProperties;
  withMotion?: boolean;
  alt?: string;
}

export function Logo({
  variant = "mark",
  size = 64,
  className = "",
  style,
  withMotion = false,
  alt = "Ecomex",
}: LogoProps) {
  const file =
    variant === "horizontal" ? "logo-horizontal.svg" :
    variant === "vertical"   ? "logo-vertical.svg"   :
                                "icon-square.svg";

  const radiusClass = variant === "mark" ? "rounded-[18%]" : "";
  const dims = (() => {
    if (variant === "horizontal") return { w: size * 3, h: size };
    if (variant === "vertical")   return { w: size,     h: size * 1.15 };
    return { w: size, h: size };
  })();

  return (
    <img
      src={`/brand/${file}`}
      alt={alt}
      width={dims.w}
      height={dims.h}
      className={["ecx-logo", radiusClass, withMotion && "ecx-motion", className].filter(Boolean).join(" ")}
      style={style}
      loading="eager"
    />
  );
}
