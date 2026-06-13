import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelpCircle, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { RailItem } from './sections';

interface IconRailProps {
  items: RailItem[];
  /** Whether a rail item is permitted (already-bound predicate). */
  canShow: (item: RailItem) => boolean;
  helpHref: string;
  onSignOut: () => void;
  /** Admin rail inverts to near-black; tenant rail is white-cream. */
  variant?: 'tenant' | 'admin';
}

/**
 * Thin (~64px) icon-ONLY left rail for quick-jump tools NOT in the top pill-nav
 * (DESIGN.md §1.3). Active = near-black rounded square + orange marker. Tooltips on
 * hover. Bottom-pinned help + sign-out. Hidden on mobile (bottom tab bar replaces it).
 */
export function IconRail({
  items,
  canShow,
  helpHref,
  onSignOut,
  variant = 'tenant',
}: IconRailProps) {
  const { t } = useTranslation('nav');
  const location = useLocation();
  const isAdmin = variant === 'admin';

  const railClass = cn(
    'hidden md:flex w-16 flex-col items-center shrink-0 py-3 gap-1.5',
    'border-r',
    isAdmin
      ? 'bg-secondary text-secondary-foreground border-white/10'
      : 'bg-card text-foreground border-border',
  );

  const itemClass = (active: boolean) =>
    cn(
      'relative grid place-items-center h-11 w-11 rounded-control transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      isAdmin ? 'focus-visible:ring-offset-secondary' : 'focus-visible:ring-offset-card',
      active
        ? isAdmin
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground'
        : isAdmin
          ? 'text-secondary-foreground/65 hover:bg-white/10 hover:text-secondary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  const visible = items.filter(canShow);

  return (
    <aside className={railClass} aria-label="Quick tools">
      {isAdmin && (
        <div className="mb-1 grid h-11 w-11 place-items-center rounded-control bg-primary text-primary-foreground text-[8px] font-bold uppercase tracking-[0.12em]">
          Adm
        </div>
      )}
      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {visible.map((item) => {
          const active =
            location.pathname === item.href ||
            location.pathname.startsWith(item.href + '/');
          return (
            <Tooltip key={item.href} delayDuration={150}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  aria-label={t(item.titleKey, { defaultValue: item.label })}
                  aria-current={active ? 'page' : undefined}
                  className={itemClass(active)}
                >
                  {/* 3px orange inner marker on the active item. */}
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  {item.icon}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t(item.titleKey, { defaultValue: item.label })}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Bottom-pinned: help + sign-out */}
      <div className="mt-auto flex flex-col items-center gap-1.5">
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Link
              to={helpHref}
              aria-label={t('user.helpSupport', { defaultValue: 'Help' })}
              className={itemClass(false)}
            >
              <HelpCircle className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {t('user.helpSupport', { defaultValue: 'Help' })}
          </TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSignOut}
              aria-label={t('user.signOut', { defaultValue: 'Sign out' })}
              className={cn(itemClass(false), 'text-destructive hover:text-destructive')}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {t('user.signOut', { defaultValue: 'Sign out' })}
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
