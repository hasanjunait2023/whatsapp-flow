import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/config/branding';

interface BrandMarkProps {
  to: string;
  suffix?: string;
  variant?: 'tenant' | 'admin';
  withMotion?: boolean;
}

/**
 * Brand cluster for sidebar: rounded-square violet badge + product name.
 * 2026-07-01 brand refresh — uses official icon-square.svg.
 */
export function BrandMark({ to, suffix, variant = 'tenant', withMotion = true }: BrandMarkProps) {
  const isAdmin = variant === 'admin';
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <img
        src="/brand/icon-square.svg"
        alt=""
        className={cn(
          "h-8 w-8 object-contain rounded-[18%]",
          "shadow-[0_4px_12px_rgba(124,58,237,0.35)]",
          withMotion && "ecx-motion"
        )}
      />
      <span
        className={cn(
          'hidden truncate text-[15px] font-semibold sm:inline',
          isAdmin ? 'text-secondary-foreground' : 'text-foreground',
        )}
      >
        {APP_NAME}
        {suffix && <span className="text-muted-foreground"> {suffix}</span>}
      </span>
    </Link>
  );
}
