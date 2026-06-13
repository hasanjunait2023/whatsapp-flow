import { Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { m, staggerItem, useCountUp } from "@/lib/motion";
import { formatCurrency } from "@/lib/currency";

interface PaymentsRevenueTileProps {
  /** Hero number — total verified payment revenue (BDT). */
  total: number;
  loading?: boolean;
}

/**
 * The single full-orange surface on the Payments page (DESIGN_SYSTEM §7).
 * Focal KPI for total verified revenue — no nav CTA since we're already here.
 */
export function PaymentsRevenueTile({ total, loading = false }: PaymentsRevenueTileProps) {
  const display = useCountUp(total);

  if (loading) {
    return (
      <div className="flex h-full min-h-[120px] flex-col gap-4 rounded-card bg-primary/80 p-5">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="mt-auto h-8 w-32 bg-white/30" />
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
            <Wallet className="h-4 w-4" aria-hidden />
            Verified revenue
          </span>
          <p className="mt-auto tabular-nums text-3xl font-bold leading-none tracking-tight">
            {formatCurrency(display)}
          </p>
        </div>
      </div>
    </m.div>
  );
}
