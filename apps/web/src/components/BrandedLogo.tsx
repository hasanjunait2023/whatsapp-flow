import { cn } from '@/lib/utils';

interface BrandedLogoProps {
  theme?: 'dark' | 'light' | 'auto';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  static?: boolean;
}

const SIZE: Record<NonNullable<BrandedLogoProps['size']>, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
  xl: 'h-20',
};

/**
 * Ecomex wordmark logo. Uses the official horizontal brand SVG.
 * Static mode disables the entrance animation.
 */
export function BrandedLogo({ theme = 'light', size = 'md', className, static: noMotion }: BrandedLogoProps) {
  return (
    <img
      src="/brand/logo-horizontal.svg"
      alt="Ecomex"
      className={cn(
        SIZE[size],
        "w-auto object-contain",
        !noMotion && "ecx-motion",
        className
      )}
    />
  );
}
