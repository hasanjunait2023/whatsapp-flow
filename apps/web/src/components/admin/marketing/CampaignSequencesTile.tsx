import { CalendarRange } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { m, staggerItem, useCountUp } from "@/lib/motion";

interface CampaignSequencesTileProps {
  /** Hero number — total sequences scheduled across the campaign timeline. */
  total: number;
  /** Distinct weeks covered, for the sub-label. */
  weeks: number;
  loading?: boolean;
}

/**
 * The single full-orange surface on the campaign detail page (DESIGN.md §2.2).
 * Focal KPI = total scheduled sequences — orange stays rare so it stays loud.
 */
export function CampaignSequencesTile({ total, weeks, loading = false }: CampaignSequencesTileProps) {
  const display = useCountUp(total);

  if (loading) {
    return (
      <div className="flex h-full min-h-[120px] flex-col gap-4 rounded-card bg-primary/80 p-5">
        <Skeleton className="h-4 w-24 bg-white/30" />
        <Skeleton className="mt-auto h-8 w-16 bg-white/30" />
      </div>
    );
  }

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[120px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-2">
        {/* Subtle depth gradient — opacity only, no layout cost */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
            <CalendarRange className="h-4 w-4" aria-hidden />
            Sequences
          </span>
          <p className="mt-auto tabular-nums text-3xl font-bold leading-none tracking-tight">{display}</p>
          <p className="mt-1 tabular-nums text-xs text-primary-foreground/75">
            across {weeks.toLocaleString("en-US")} week{weeks === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </m.div>
  );
}
