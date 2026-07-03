import { cn } from '@/lib/utils';
import '@/brand'; // side-effect: pulls brand.css (violet tokens + .ecx-logo-reveal keyframes)

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Adds the violet mask-reveal sweep animation on first mount.
   * Set false for static placements (favicons, repeated nav icons) where the
   * sweep would replay on every navigation.
   */
  withMotion?: boolean;
}

/**
 * Ecomex logo mark — rounded-square violet badge with ribbon-fold icon.
 * Uses /brand/icon-square.svg (Boss's official spec, 2026-07-01).
 *
 * Motion (optional, opt-in via withMotion):
 *   1. violet-tint mask sweep (ribbon-fold unfurl, 1.4s)
 *   2. inner ribbon scale-pop with bounce (0.9s, +200ms delay)
 *   3. container rises 8px while settling (0.6s, +600ms delay)
 *
 * Reduced-motion: animations collapse to a fade-in only.
 */
export function AppLogo({ className, size = 'md', withMotion = false }: AppLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12',
  };

  if (!withMotion) {
    return (
      <img
        src="/brand/icon-square.svg"
        alt="Ecomex"
        className={cn(
          sizeClasses[size],
          "object-contain rounded-[18%]",
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "relative inline-block ecx-logo-reveal",
        sizeClasses[size],
        className
      )}
      aria-label="Ecomex"
    >
      <span className="ecx-logo-mask" aria-hidden="true">
        <img
          src="/brand/icon-square.svg"
          alt=""
          className="h-full w-full object-contain rounded-[18%] ecx-logo-pop"
          draggable={false}
        />
      </span>
    </span>
  );
}