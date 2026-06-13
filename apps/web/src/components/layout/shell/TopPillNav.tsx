import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { Section } from './sections';

interface TopPillNavProps {
  sections: Section[];
  activeId: string;
  /** Shared layoutId scope — keep distinct between tenant + admin shells. */
  scope: string;
  /** Optional unread counts keyed by section id (e.g. Inbox). */
  badges?: Record<string, number>;
  /** Optional per-section permission predicate (hide a pill the user can't access). */
  canShow?: (section: Section) => boolean;
}

/**
 * Center pill-nav of the ~6 primary sections (DESIGN.md §1.2 / §1.5).
 * Active pill = solid near-black (`bg-secondary text-secondary-foreground`) with a
 * Framer shared-element (`layoutId`) fill — the one allowed shared-layout animation,
 * transform/opacity only. Inactive = grey text → hover muted pill.
 */
export function TopPillNav({ sections, activeId, scope, badges, canShow }: TopPillNavProps) {
  const { t } = useTranslation('nav');
  const visible = canShow ? sections.filter(canShow) : sections;

  return (
    <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
      {visible.map((section) => {
        const isActive = section.id === activeId;
        const badge = badges?.[section.id] ?? 0;
        return (
          <Link
            key={section.id}
            to={section.root}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              isActive
                ? 'text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {isActive && (
              <m.span
                layoutId={`${scope}-active-pill`}
                className="absolute inset-0 rounded-full bg-secondary"
                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {t(section.titleKey, { defaultValue: section.label })}
              {badge > 0 && (
                <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
