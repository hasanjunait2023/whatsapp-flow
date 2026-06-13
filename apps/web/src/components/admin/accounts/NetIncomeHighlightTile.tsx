import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { m, staggerItem, useCountUp } from "@/lib/motion";
import { formatCurrency } from "@/lib/currency";

interface NetIncomeHighlightTileProps {
  /** Hero number — net income (revenue − expenses) for the selected range (BDT). */
  netIncome: number;
  /** Profit margin %, shown as the supporting figure. */
  profitMargin: number;
  loading?: boolean;
}

/**
 * The single full-orange surface on the Accounts page (DESIGN.md §2.2).
 * Focal KPI for net income — orange stays rare so it stays loud.
 */
export function NetIncomeHighlightTile({ netIncome, profitMargin, loading = false }: NetIncomeHighlightTileProps) {
  const display = useCountUp(netIncome);

  if (loading) {
    return (
      <div className="flex h-full min-h-[120px] flex-col gap-4 rounded-card bg-primary/80 p-5">
        <Skeleton className="h-4 w-24 bg-white/30" />
        <Skeleton className="mt-auto h-8 w-32 bg-white/30" />
      </div>
    );
  }

  const isProfit = netIncome >= 0;
  const Trend = isProfit ? TrendingUp : TrendingDown;

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[120px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-accent">
        {/* Subtle depth gradient — opacity only, no layout cost */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <Trend className="h-4 w-4" aria-hidden />
              Net income
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {profitMargin.toFixed(1)}%
            </span>
          </div>
          <p className="mt-auto tabular-nums text-3xl font-bold leading-none tracking-tight">
            {formatCurrency(display)}
          </p>
          <p className="mt-1 text-xs text-primary-foreground/75">{isProfit ? "Profit this period" : "Loss this period"}</p>
        </div>
      </div>
    </m.div>
  );
}
