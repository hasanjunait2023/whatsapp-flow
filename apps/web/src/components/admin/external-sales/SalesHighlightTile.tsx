import { TrendingUp, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { m, staggerItem, useCountUp } from '@/lib/motion';
import { formatCurrency } from '@/lib/currency';

interface SalesHighlightTileProps {
  /** Hero figure — total revenue from completed external orders (BDT). */
  revenue: number;
  /** Count of completed orders backing the figure. */
  completed: number;
  loading?: boolean;
}

/**
 * The single full-orange surface on the External Sales page (DESIGN.md §2.2).
 * Total revenue is the page's focal metric — orange stays rare so it stays loud.
 * Every other stat uses a soft KpiCard.
 */
export function SalesHighlightTile({ revenue, completed, loading = false }: SalesHighlightTileProps) {
  const display = useCountUp(revenue);

  if (loading) {
    return (
      <div className="flex h-full min-h-[140px] flex-col gap-4 rounded-card bg-primary/80 p-5">
        <Skeleton className="h-4 w-20 bg-white/30" />
        <Skeleton className="mt-auto h-8 w-32 bg-white/30" />
      </div>
    );
  }

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[140px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <TrendingUp className="h-4 w-4" aria-hidden />
              Total revenue
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {completed.toLocaleString('en-US')} completed
            </span>
          </div>

          <p className="mt-2 tabular-nums text-3xl font-bold leading-none tracking-tight md:text-4xl">
            {formatCurrency(display)}
          </p>

          <span className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-medium text-primary-foreground/80">
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            Collected from completed orders
          </span>
        </div>
      </div>
    </m.div>
  );
}
