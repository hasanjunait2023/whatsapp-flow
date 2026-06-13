import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, ArrowRight, Wallet } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { m, staggerItem, useCountUp } from "@/lib/motion";
import { formatCurrency } from "@/lib/currency";

interface PlatformRevenueHighlightTileProps {
  /** Hero number — total verified platform revenue (BDT). */
  totalRevenue: number;
  /** +/- delta vs the previous month. */
  changePct: number;
  /** Monthly revenue series for the background sparkline. */
  spark: { month: string; revenue: number }[];
  loading?: boolean;
}

/**
 * The single full-orange surface on the admin dashboard (DESIGN_SYSTEM §7).
 * Admin variant of EarningsHighlightTile — same focal treatment, platform-revenue data
 * and an /admin/payments link instead of the tenant /orders link.
 */
export function PlatformRevenueHighlightTile({
  totalRevenue,
  changePct,
  spark,
  loading = false,
}: PlatformRevenueHighlightTileProps) {
  const display = useCountUp(totalRevenue);

  if (loading) {
    return (
      <div className="flex h-full min-h-[180px] flex-col gap-4 rounded-card bg-primary/80 p-6">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-10 w-32 bg-white/30" />
        <Skeleton className="mt-auto h-9 w-32 bg-white/30" />
      </div>
    );
  }

  const isUp = changePct >= 0;

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-card bg-primary p-6 text-primary-foreground shadow-elevation-2">
        {/* Subtle depth gradient — opacity only, no layout cost */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        {/* Background sparkline */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 opacity-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="platformRevenueSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary-foreground))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary-foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth={2}
                fill="url(#platformRevenueSpark)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <Wallet className="h-4 w-4" aria-hidden />
              Total revenue
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums",
              )}
            >
              {isUp ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
              {`${changePct > 0 ? "+" : ""}${changePct}%`}
            </span>
          </div>

          <p className="mt-2 tabular-nums text-4xl font-bold leading-none tracking-tight">
            {formatCurrency(display)}
          </p>
          <p className="mt-1 text-xs text-primary-foreground/75">vs last month</p>

          <Link
            to="/admin/payments"
            className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-control bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            Review payments
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </m.div>
  );
}
