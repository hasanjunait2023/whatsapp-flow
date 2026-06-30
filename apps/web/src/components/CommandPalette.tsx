import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CommandRoute {
  /** URL path */
  path: string;
  /** Display label (English — Bengali users get same UI, no i18n yet) */
  label: string;
  /** Optional keywords for fuzzy search */
  keywords?: string[];
  /** Category for grouping */
  group: 'Navigate' | 'Admin' | 'Settings' | 'Help';
}

/**
 * The full route inventory — keep in sync with App.tsx as routes evolve.
 * Order matters: most-used routes first (used as "recents" for empty query).
 */
const ROUTES: CommandRoute[] = [
  // Tenant dashboard
  { path: '/dashboard', label: 'Dashboard', group: 'Navigate', keywords: ['home', 'overview'] },
  { path: '/inbox', label: 'Inbox', group: 'Navigate', keywords: ['messages', 'whatsapp', 'chat'] },
  { path: '/fb-inbox', label: 'Facebook Inbox', group: 'Navigate', keywords: ['fb', 'messenger'] },
  { path: '/contacts', label: 'Contacts', group: 'Navigate', keywords: ['customers', 'leads'] },
  { path: '/orders', label: 'Orders', group: 'Navigate' },
  { path: '/products', label: 'Products', group: 'Navigate', keywords: ['catalog', 'inventory'] },
  { path: '/inventory', label: 'Inventory', group: 'Navigate', keywords: ['stock'] },
  { path: '/automation', label: 'Automation', group: 'Navigate' },
  { path: '/workflows', label: 'Workflows', group: 'Navigate' },
  { path: '/team', label: 'Team', group: 'Navigate', keywords: ['staff', 'members'] },
  { path: '/analytics', label: 'Analytics', group: 'Navigate', keywords: ['stats', 'reports'] },
  { path: '/billing', label: 'Billing', group: 'Navigate', keywords: ['subscription', 'plans'] },
  { path: '/settings', label: 'Settings', group: 'Settings' },
  { path: '/notifications', label: 'Notifications', group: 'Navigate' },
  { path: '/complaints', label: 'Complaints', group: 'Navigate' },
  { path: '/ai-agent', label: 'AI Agent', group: 'Navigate', keywords: ['bot', 'assistant'] },
  { path: '/accounts', label: 'Accounts', group: 'Navigate', keywords: ['accounting'] },
  { path: '/number-health', label: 'Number Health', group: 'Navigate', keywords: ['whatsapp', 'ban'] },
  { path: '/instances', label: 'WhatsApp Instances', group: 'Navigate' },

  // Admin
  { path: '/admin', label: 'Admin Dashboard', group: 'Admin' },
  { path: '/admin/tenants', label: 'Admin · Tenants', group: 'Admin' },
  { path: '/admin/users', label: 'Admin · Users', group: 'Admin' },
  { path: '/admin/instances', label: 'Admin · Instances', group: 'Admin' },
  { path: '/admin/accounts', label: 'Admin · Accounts', group: 'Admin' },
  { path: '/admin/leads', label: 'Admin · Leads', group: 'Admin' },
  { path: '/admin/marketing', label: 'Admin · Marketing', group: 'Admin' },
  { path: '/admin/payments', label: 'Admin · Payments', group: 'Admin' },
  { path: '/admin/subscriptions', label: 'Admin · Subscriptions', group: 'Admin' },
  { path: '/admin/plans', label: 'Admin · Plans', group: 'Admin' },
  { path: '/admin/team', label: 'Admin · Team', group: 'Admin' },
  { path: '/admin/reports', label: 'Admin · Reports', group: 'Admin' },
  { path: '/admin/support', label: 'Admin · Support', group: 'Admin' },
  { path: '/admin/settings', label: 'Admin · Settings', group: 'Settings' },
  { path: '/admin/audit-logs', label: 'Admin · Audit Logs', group: 'Admin' },

  // Settings / Account
  { path: '/onboarding', label: 'Onboarding', group: 'Settings' },
  { path: '/pending-activation', label: 'Pending Activation', group: 'Settings' },

  // Help / public
  { path: '/', label: 'Home (Landing)', group: 'Help', keywords: ['marketing', 'public'] },
  { path: '/privacy', label: 'Privacy Policy', group: 'Help' },
  { path: '/terms', label: 'Terms of Service', group: 'Help' },
];

/**
 * Simple fuzzy match: case-insensitive substring across label + keywords.
 * Returns true if every query word appears in the haystack.
 */
function matches(route: CommandRoute, query: string): boolean {
  if (!query) return true;
  const haystack = `${route.label} ${route.keywords?.join(' ') ?? ''} ${route.path}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

const RECENTS_KEY = 'ecomex-cmd-recent';
const MAX_RECENTS = 5;

function getRecents(): string[] {
  try {
    const stored = localStorage.getItem(RECENTS_KEY);
    if (stored) return JSON.parse(stored).filter((p): p is string => typeof p === 'string');
  } catch {
    /* ignore */
  }
  return [];
}

function pushRecent(path: string): void {
  try {
    const recents = getRecents().filter((p) => p !== path);
    recents.unshift(path);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
  } catch {
    /* ignore */
  }
}

/**
 * Global command palette (Cmd+K / Ctrl+K).
 * Mount once at the app shell. Opens a centered modal with fuzzy search
 * across all 75 routes, plus keyboard navigation (↑/↓/Enter/Esc).
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  // Global keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Win/Linux)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Filter routes by query; fall back to recents if query empty.
  const results = useMemo(() => {
    if (!query) {
      const recents = getRecents();
      const recentRoutes = recents
        .map((p) => ROUTES.find((r) => r.path === p))
        .filter((r): r is CommandRoute => !!r);
      // Append unvisited common routes so the palette is never empty.
      const filler = ROUTES.filter((r) => !recents.includes(r.path)).slice(0, 8);
      return [...recentRoutes, ...filler];
    }
    return ROUTES.filter((r) => matches(r, query)).slice(0, 30);
  }, [query]);

  // Reset active row when results change.
  useEffect(() => {
    setActive(0);
  }, [results.length]);

  const select = useCallback(
    (path: string) => {
      pushRecent(path);
      setOpen(false);
      setQuery('');
      navigate(path);
    },
    [navigate],
  );

  // Keyboard nav inside the palette.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[active]) {
        e.preventDefault();
        select(results[active].path);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, active, select]);

  if (!open) return null;

  // Group results for the dropdown UI.
  const grouped = results.reduce<Record<string, CommandRoute[]>>((acc, r) => {
    (acc[r.group] ||= []).push(r);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[var(--z-max)] flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => {
        // Click on backdrop closes the palette.
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div className="relative w-full max-w-xl glass-3d-strong rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a page…"
            className="border-0 bg-transparent focus-visible:ring-0 px-0 h-auto text-base"
            aria-label="Search routes"
          />
          <kbd className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
            <Command className="size-3" />K
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-1">
                <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {group}
                </div>
                {items.map((r) => {
                  flatIndex++;
                  const isActive = flatIndex === active;
                  return (
                    <button
                      key={r.path}
                      type="button"
                      onClick={() => select(r.path)}
                      onMouseEnter={() => setActive(results.indexOf(r))}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-lp-primary/10 text-lp-primary'
                          : 'hover:bg-muted/60',
                      )}
                    >
                      <span className="flex-1 truncate">{r.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {r.path}
                      </span>
                      <ArrowRight
                        className={cn(
                          'size-3.5 shrink-0 transition-opacity',
                          isActive ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate ·{' '}
            <kbd className="font-mono">↵</kbd> select ·{' '}
            <kbd className="font-mono">Esc</kbd> close
          </span>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}