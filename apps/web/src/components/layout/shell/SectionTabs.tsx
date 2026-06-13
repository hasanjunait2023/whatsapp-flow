import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Section, SectionRoute } from './sections';

interface SectionTabsProps {
  section: Section;
  /** Whether a sub-route is permitted (already-bound predicate). */
  canShow: (route: SectionRoute) => boolean;
  /** Optional unread counts keyed by route href. */
  badges?: Record<string, number>;
}

/**
 * In-page pill sub-tabs for a section (DESIGN.md §1.5 + §1). Rendered once by the
 * layout above the <Outlet/> — individual pages don't re-implement it. Keeps the top
 * pill-nav at 6 while every route in the section stays one click away. Pill track
 * (`bg-muted`) + active card, matching the Tabs primitive look, via NavLink active
 * styling. Single-page sections (no `routes`) render nothing.
 */
export function SectionTabs({ section, canShow, badges }: SectionTabsProps) {
  const { t } = useTranslation('nav');

  const routes = (section.routes ?? []).filter((r) => canShow(r));
  if (routes.length < 2) return null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
      <div
        role="tablist"
        aria-label={t(section.titleKey, { defaultValue: section.label })}
        className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border/50 bg-muted p-1 scrollbar-thin"
      >
        {routes.map((route) => (
          <NavLink
            key={route.href}
            to={route.href}
            end={route.href === section.root}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-card text-foreground shadow-elevation-1'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <span className="flex items-center gap-1.5">
              {t(route.titleKey, { defaultValue: route.label })}
              {(badges?.[route.href] ?? 0) > 0 && (
                <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {badges![route.href] > 99 ? '99+' : badges![route.href]}
                </span>
              )}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
