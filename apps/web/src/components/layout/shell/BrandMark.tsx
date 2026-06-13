import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/config/branding';
import logoImage from '@/assets/logo.png';

interface BrandMarkProps {
  to: string;
  /** Suffix appended after the product name (e.g. "Admin"). */
  suffix?: string;
  variant?: 'tenant' | 'admin';
}

/**
 * Brand cluster (DESIGN.md §1.2 left): orange rounded-square favicon glyph + product
 * name (near-black, semibold). Clicking → the panel root.
 */
export function BrandMark({ to, suffix, variant = 'tenant' }: BrandMarkProps) {
  const isAdmin = variant === 'admin';
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-control bg-primary">
        <img src={logoImage} alt="" className="h-5 w-5 object-contain" />
      </span>
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
