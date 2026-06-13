import { CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { m, staggerItem, useCountUp } from "@/lib/motion";

interface ResolvedHighlightTileProps {
  /** Hero number — tickets successfully resolved. */
  resolved: number;
  /** Total tickets, used to derive the resolution-rate pill. */
  total: number;
  loading?: boolean;
}

/**
 * The single full-orange surface on the Reports page (DESIGN.md §2.2).
 * Focal KPI for resolved tickets — the page's loudest figure.
 */
export function ResolvedHighlightTile({ resolved, total, loading = false }: ResolvedHighlightTileProps) {
  const display = useCountUp(resolved);

  if (loading) {
    return (
      <div className="flex h-full min-h-[120px] flex-col gap-4 rounded-card bg-primary/80 p-5">
        <Skeleton className="h-4 w-24 bg-white/30" />
        <Skeleton className="mt-auto h-8 w-24 bg-white/30" />
      </div>
    );
  }

  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[120px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Resolved tickets
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {rate}%
            </span>
          </div>
          <p className="mt-auto tabular-nums text-3xl font-bold leading-none tracking-tight">
            {display.toLocaleString("en-US")}
          </p>
          <p className="mt-1 text-xs text-primary-foreground/75">of {total.toLocaleString("en-US")} total</p>
        </div>
      </div>
    </m.div>
  );
}
