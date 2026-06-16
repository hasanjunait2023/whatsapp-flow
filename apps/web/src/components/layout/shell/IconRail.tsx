import { Fragment, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelpCircle, LogOut, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { RailItem } from './sections';

const STORAGE_KEY = 'wa-rail-collapsed';

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

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
 * Left rail for quick-jump tools NOT in the top pill-nav (DESIGN.md §1.3).
 * Expanded (default): icon + text label, ~224px. Collapsed: icon-only ~64px with
 * hover tooltips. The collapse state persists in localStorage. Active = filled square
 * + orange left marker. Bottom-pinned help + sign-out + collapse toggle. Hidden on
 * mobile (the bottom tab bar / drawer replaces it).
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
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      }
      return next;
    });
  };

  const railClass = cn(
    'hidden md:flex flex-col shrink-0 py-3 gap-1 border-r transition-[width] duration-200 ease-out',
    collapsed ? 'w-16 items-center px-0' : 'w-56 items-stretch px-2',
    isAdmin
      ? 'bg-secondary text-secondary-foreground border-white/10'
      : 'bg-card text-foreground border-border',
  );

  const rowClass = (active: boolean) =>
    cn(
      'relative flex items-center rounded-control transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      isAdmin ? 'focus-visible:ring-offset-secondary' : 'focus-visible:ring-offset-card',
      collapsed ? 'h-11 w-11 justify-center' : 'h-10 w-full gap-3 px-2.5',
      active
        ? isAdmin
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground'
        : isAdmin
          ? 'text-secondary-foreground/65 hover:bg-white/10 hover:text-secondary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  const rowInner = (icon: ReactNode, label: string, active: boolean) => (
    <>
      {/* 3px orange inner marker on the active item. */}
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <span className="grid shrink-0 place-items-center">{icon}</span>
      {!collapsed && <span className="truncate text-sm font-medium">{label}</span>}
    </>
  );

  /** Wrap a row in a tooltip only when collapsed (label is hidden then). */
  const row = (key: string, label: string, node: ReactNode) =>
    collapsed ? (
      <Tooltip key={key} delayDuration={150}>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    ) : (
      <Fragment key={key}>{node}</Fragment>
    );

  const visible = items.filter(canShow);
  const helpLabel = t('user.helpSupport', { defaultValue: 'Help' });
  const signOutLabel = t('user.signOut', { defaultValue: 'Sign out' });

  return (
    <aside className={railClass} aria-label="Quick tools">
      {isAdmin && (
        <div className={cn('mb-1 flex items-center gap-2', collapsed ? 'justify-center' : 'px-1')}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary text-[8px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
            Adm
          </div>
          {!collapsed && <span className="text-sm font-semibold">Admin</span>}
        </div>
      )}

      <nav className={cn('flex flex-1 flex-col gap-1', collapsed && 'items-center')}>
        {visible.map((item) => {
          const active =
            location.pathname === item.href ||
            location.pathname.startsWith(item.href + '/');
          const label = t(item.titleKey, { defaultValue: item.label });
          return row(
            item.href,
            label,
            <Link
              to={item.href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={rowClass(active)}
            >
              {rowInner(item.icon, label, active)}
            </Link>,
          );
        })}
      </nav>

      {/* Bottom-pinned: help + sign-out + collapse toggle */}
      <div className={cn('mt-auto flex flex-col gap-1', collapsed && 'items-center')}>
        {row(
          'help',
          helpLabel,
          <Link to={helpHref} aria-label={helpLabel} className={rowClass(false)}>
            {rowInner(<HelpCircle className="h-5 w-5" />, helpLabel, false)}
          </Link>,
        )}
        {row(
          'signout',
          signOutLabel,
          <button
            type="button"
            onClick={onSignOut}
            aria-label={signOutLabel}
            className={cn(rowClass(false), 'text-destructive hover:text-destructive')}
          >
            {rowInner(<LogOut className="h-5 w-5" />, signOutLabel, false)}
          </button>,
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          className={rowClass(false)}
        >
          {rowInner(
            collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />,
            collapsed ? 'Expand' : 'Collapse',
            false,
          )}
        </button>
      </div>
    </aside>
  );
}
