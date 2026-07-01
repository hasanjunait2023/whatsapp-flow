import { cn } from '@/lib/utils';
import logoImage from '@/assets/logo.png';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

/**
 * AppLogo is the legacy raw-PNG renderer, used by Nav / Footer on light
 * surfaces. After the BrandedLogo treatment, callers who want motion
 * should use <BrandedLogo theme="light" /> instead — AppLogo is kept as
 * a static fallback for places where motion would be distracting
 * (e.g. inside a tight button or a list of footer links).
 */
export function AppLogo({ className, size = 'md', showText = false }: AppLogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-12'
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={logoImage}
        alt="What A App"
        className={cn(sizeClasses[size], "object-contain")}
      />
    </div>
  );
}
