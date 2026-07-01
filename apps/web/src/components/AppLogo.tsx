import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withMotion?: boolean;
}

/**
 * Ecomex logo mark — rounded-square violet badge with ribbon-fold icon.
 * Uses /brand/icon-square.svg (Boss's official spec, 2026-07-01).
 */
export function AppLogo({ className, size = 'md', withMotion = false }: AppLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12',
  };

  return (
    <img
      src="/brand/icon-square.svg"
      alt="Ecomex"
      className={cn(
        sizeClasses[size],
        "object-contain rounded-[18%]",
        withMotion && "ecx-motion",
        className
      )}
    />
  );
}
