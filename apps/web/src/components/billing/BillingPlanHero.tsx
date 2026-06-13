import { format } from 'date-fns';
import { Sparkles, ArrowUpRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { m, staggerItem, useCountUp } from '@/lib/motion';

interface BillingPlanHeroProps {
  planName: string | null;
  priceMonthly: number;
  /** Messages used this period. */
  used: number;
  /** Plan message allowance for the period. */
  limit: number;
  /** Renewal / period-end date (ISO) or null. */
  renewalDate: string | null;
  /** Status pill label (e.g. "Active", "Trial"). */
  statusLabel: string;
  loading?: boolean;
  onUpgradeClick?: () => void;
  onRenewClick?: () => void;
  /** Whether to surface the Renew action (near-expiry / past-due). */
  showRenew?: boolean;
}

/**
 * The single full-orange surface on the Billing page (DESIGN.md §2.2).
 * Current plan + price + renewal date + an orange usage bar on a primary fill.
 */
export function BillingPlanHero({
  planName,
  priceMonthly,
  used,
  limit,
  renewalDate,
  statusLabel,
  loading = false,
  onUpgradeClick,
  onRenewClick,
  showRenew = false,
}: BillingPlanHeroProps) {
  const displayPrice = useCountUp(priceMonthly);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  if (loading) {
    return (
      <div className="flex h-full min-h-[200px] flex-col gap-4 rounded-card bg-primary/80 p-6">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-10 w-40 bg-white/30" />
        <Skeleton className="mt-auto h-3 w-full bg-white/30" />
        <Skeleton className="h-9 w-40 bg-white/30" />
      </div>
    );
  }

  return (
    <m.div variants={staggerItem} className="h-full">
      <div className="relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-card bg-primary p-6 text-primary-foreground shadow-elevation-2">
        {/* Subtle depth gradient — opacity only, no layout cost */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />

        <div className="relative z-10 flex h-full flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <Sparkles className="h-4 w-4" aria-hidden />
              Current plan
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
              {statusLabel}
            </span>
          </div>

          <div>
            <p className="text-2xl font-bold leading-tight tracking-tight">
              {planName ?? 'No plan'}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="tabular-nums text-4xl font-bold leading-none tracking-tight">
                ৳{displayPrice.toLocaleString('en-US')}
              </span>
              <span className="text-sm text-primary-foreground/80">/month</span>
            </p>
            {renewalDate && (
              <p className="mt-1.5 text-xs text-primary-foreground/80">
                Renews {format(new Date(renewalDate), 'MMMM d, yyyy')}
              </p>
            )}
          </div>

          {/* Usage progress — orange surface, white track + bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-primary-foreground/85">
              <span>Messages used</span>
              <span className="tabular-nums font-semibold">
                {used.toLocaleString('en-US')} of {limit.toLocaleString('en-US')}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-white/25"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Messages used this period"
            >
              <div
                className="h-full rounded-full bg-white transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onUpgradeClick}
              className={cn(
                'inline-flex h-10 min-h-[44px] items-center gap-1.5 rounded-control bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-white/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary',
              )}
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden />
              Upgrade plan
            </button>
            {showRenew && (
              <button
                type="button"
                onClick={onRenewClick}
                className={cn(
                  'inline-flex h-10 min-h-[44px] items-center gap-1.5 rounded-control bg-white/15 px-4 text-sm font-medium text-primary-foreground backdrop-blur-sm transition-colors hover:bg-white/25',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary',
                )}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Renew now
              </button>
            )}
          </div>
        </div>
      </div>
    </m.div>
  );
}
