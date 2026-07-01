import { cn } from '@/lib/utils';
import logoImage from '@/assets/logo.png';

interface BrandedLogoProps {
  /**
   * Visual mode.
   * - `dark`  → use the raw PNG on dark backgrounds (white text on dark bg).
   *             Adds a soft violet glow pulse behind it.
   * - `light` → wrap the PNG in a circular white badge with a violet
   *             gradient orbit ring + diagonal shine sweep. Use on
   *             light backgrounds where the raw dark-bg PNG would be
   *             invisible.
   * - `auto`  → pick based on the `data-theme` attribute on <html> /
   *             `.dark` class. Defaults to `light`.
   */
  theme?: 'dark' | 'light' | 'auto';
  /** Visual height in Tailwind units. Default `h-10`. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional className passthrough. */
  className?: string;
  /** Disable the pulse/orbit/shine motion (e.g. in print/export). */
  static?: boolean;
}

const SIZE: Record<NonNullable<BrandedLogoProps['size']>, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
  xl: 'h-20',
};

const BADGE_PADDING: Record<NonNullable<BrandedLogoProps['size']>, string> = {
  sm: 'p-2',
  md: 'p-2.5',
  lg: 'p-3',
  xl: 'p-4',
};

const IMG_SIZE: Record<NonNullable<BrandedLogoProps['size']>, string> = {
  sm: 'h-4',
  md: 'h-5',
  lg: 'h-8',
  xl: 'h-12',
};

/**
 * BrandedLogo
 * -----------
 * Single source of truth for rendering the Ecomex wordmark across the
 * whole product. Provides two presentation modes:
 *
 * 1. `theme="dark"`  → violet-gradient panels (left half of AuthLayout,
 *                       hero sections with dark / overlay backgrounds)
 * 2. `theme="light"` → white form panels, nav bars, footer
 *
 * The dark variant was the legacy behavior — the PNG already has a dark
 * background, so we just add a subtle violet pulse behind it to make it
 * feel alive without compromising readability.
 *
 * The light variant was the gap Boss flagged: a PNG with a black
 * background does NOT read on a white surface. Wrapping it in a circular
 * badge with a violet orbit ring + diagonal shine keeps the brand intact
 * and turns the logo into a focal point.
 *
 * The motion stack (3 layers) is intentionally subtle:
 *   - pulse-glow : 3.2s scale 1 → 1.04 with violet box-shadow halo
 *   - orbit-ring : 9s full rotation of the gradient halo
 *   - orbit-shine: 5.5s diagonal sweep across the white badge
 *
 * All three are killed under `prefers-reduced-motion: reduce` — the
 * `static` prop also turns them off when needed.
 */
export function BrandedLogo({
  theme = 'auto',
  size = 'md',
  className,
  static: isStatic = false,
}: BrandedLogoProps) {
  const isDark = theme === 'dark';
  const badgeSize = SIZE[size];

  return (
    <span
      className={cn(
        'branded-logo',
        isDark && 'branded-logo--dark',
        isStatic && '[&_*]:!animate-none',
        className,
      )}
      data-theme={theme}
      aria-label="Ecomex Automation"
    >
      {isDark ? (
        // Dark mode: original PNG, no badge — just the violet pulse glow.
        <img
          src={logoImage}
          alt="Ecomex Automation"
          className={cn(badgeSize, 'object-contain')}
          draggable={false}
        />
      ) : (
        // Light mode: orbit ring + circular badge + shine sweep.
        <>
          <span
            className="branded-logo__ring"
            aria-hidden
            style={{ animationPlayState: isStatic ? 'paused' : 'running' }}
          />
          <span
            className={cn('branded-logo__badge', BADGE_PADDING[size])}
            aria-hidden={false}
            role="img"
            aria-label="Ecomex Automation"
          >
            <img
              src={logoImage}
              alt=""
              className={cn(
                IMG_SIZE[size],
                'block object-contain rounded-full',
              )}
              draggable={false}
            />
          </span>
        </>
      )}
    </span>
  );
}

export default BrandedLogo;
