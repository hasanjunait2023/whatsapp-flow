import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { m, staggerItem, useCountUp } from "@/lib/motion";

type TrendDirection = "up" | "down" | "neutral";

interface KpiCardProps {
  title: string;
  /** Numeric value driving the count-up. */
  value: number;
  /** Optional formatter for the displayed number (e.g. currency). */
  format?: (value: number) => string;
  /** Decimal places for the count-up animation. */
  decimals?: number;
  icon: LucideIcon;
  /** Status tone for the icon tile (soft bg + solid text). */
  tone?: "primary" | "success" | "warning" | "info" | "destructive";
  /** +/- delta vs last period; sign decides the pill colour. */
  trendPct?: number;
  /** Suffix label for the trend (e.g. "vs yesterday"). */
  trendLabel?: string;
  /** Right-side decoration slot (e.g. a live pulse dot). */
  accessory?: React.ReactNode;
  loading?: boolean;
}

const toneTile: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  primary: "bg-accent text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  destructive: "bg-destructive-soft text-destructive",
};

function trendMeta(pct: number): { dir: TrendDirection; className: string; Icon: typeof ArrowUpRight | null } {
  if (pct > 0) return { dir: "up", className: "bg-success-soft text-success", Icon: ArrowUpRight };
  if (pct < 0) return { dir: "down", className: "bg-destructive-soft text-destructive", Icon: ArrowDownRight };
  return { dir: "neutral", className: "bg-muted-soft text-muted-foreground", Icon: null };
}

export function KpiCard({
  title,
  value,
  format,
  decimals = 0,
  icon: Icon,
  tone = "primary",
  trendPct,
  trendLabel,
  accessory,
  loading = false,
}: KpiCardProps) {
  const display = useCountUp(value, { decimals });
  const formatted = format ? format(display) : display.toLocaleString("en-US");

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const trend = typeof trendPct === "number" ? trendMeta(trendPct) : null;

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneTile[tone])}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
          </div>

          <p className="tabular-nums text-2xl font-bold leading-none tracking-tight md:text-3xl">{formatted}</p>

          <div className="mt-auto flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  trend.className,
                )}
              >
                {trend.Icon && <trend.Icon className="h-3 w-3" aria-hidden />}
                {trend.dir === "neutral" ? "0%" : `${Math.abs(trendPct ?? 0)}%`}
              </span>
            )}
            {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
            {accessory && <span className="ml-auto">{accessory}</span>}
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}
