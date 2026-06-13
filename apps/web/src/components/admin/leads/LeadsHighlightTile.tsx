import { Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { m, staggerItem, useCountUp } from "@/lib/motion";

interface LeadsHighlightTileProps {
  /** Conversion rate as a whole-number percentage. */
  conversionRate: number;
  /** Converted lead count (the numerator). */
  converted: number;
  loading?: boolean;
}

/**
 * The single full-orange surface on the Leads page (DESIGN.md §2.2).
 * Focal KPI — conversion rate. Orange stays rare so it stays loud.
 */
export function LeadsHighlightTile({ conversionRate, converted, loading = false }: LeadsHighlightTileProps) {
  const display = useCountUp(conversionRate);

  if (loading) {
    return (
      <div className="flex h-full min-h-[120px] flex-col gap-4 rounded-card bg-primary/80 p-5">
        <Skeleton className="h-4 w-24 bg-white/30" />
        <Skeleton className="mt-auto h-8 w-24 bg-white/30" />
      </div>
    );
  }

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[120px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
            <Target className="h-4 w-4" aria-hidden />
            Conversion
          </span>
          <p className="mt-auto tabular-nums text-3xl font-bold leading-none tracking-tight">{display}%</p>
          <p className="mt-1 text-xs text-primary-foreground/75 tabular-nums">
            {converted.toLocaleString("en-US")} converted
          </p>
        </div>
      </div>
    </m.div>
  );
}
