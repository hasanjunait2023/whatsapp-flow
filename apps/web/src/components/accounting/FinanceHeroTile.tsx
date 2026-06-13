import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import { m, staggerItem, useCountUp } from "@/lib/motion";

interface FinanceHeroTileProps {
  /** Tiny muted label above the figure, e.g. "Net profit". */
  label: string;
  /** The hero financial figure (count-up + tabular-nums). */
  value: number;
  /** Small caption under the figure, e.g. "This month" or a date range. */
  caption?: string;
  /** Optional +/- delta — sign drives the arrow + tint of the pill. */
  trendPct?: number;
  /** Optional pill text instead of a percentage (e.g. "Profit" / "Loss"). */
  trendLabel?: string;
  /** Arrow direction when only `trendLabel` is supplied. Defaults to up. */
  trendUp?: boolean;
  /** Top-right glyph. Defaults to a wallet. */
  icon?: LucideIcon;
  loading?: boolean;
}

/**
 * The single full-orange surface on a finance page (DESIGN.md §2.2 / §5 — exactly ONE
 * `bg-primary` tile per page). Used for the page's focal financial figure (net profit /
 * balance). Every other metric stays on a soft `KpiCard`.
 */
export function FinanceHeroTile({
  label,
  value,
  caption,
  trendPct,
  trendLabel,
  trendUp = true,
  icon: Icon = Wallet,
  loading = false,
}: FinanceHeroTileProps) {
  const display = useCountUp(value);

  if (loading) {
    return (
      <div className="flex h-full min-h-[140px] flex-col gap-4 rounded-card bg-primary/80 p-5">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-10 w-32 bg-white/30" />
        <Skeleton className="mt-auto h-4 w-24 bg-white/30" />
      </div>
    );
  }

  const hasTrend = typeof trendPct === "number";
  const isUp = hasTrend ? (trendPct as number) >= 0 : trendUp;
  const showArrow = hasTrend || !!trendLabel;
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[140px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </span>
            {(hasTrend || trendLabel) && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums",
                )}
              >
                {showArrow && <TrendIcon className="h-3 w-3" aria-hidden />}
                {trendLabel ?? `${isUp ? "+" : ""}${trendPct}%`}
              </span>
            )}
          </div>

          <p className="mt-2 tabular-nums text-3xl font-bold leading-none tracking-tight md:text-4xl">
            {formatCurrency(display)}
          </p>

          {caption && (
            <span className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-medium text-primary-foreground/80">
              {caption}
            </span>
          )}
        </div>
      </div>
    </m.div>
  );
}
