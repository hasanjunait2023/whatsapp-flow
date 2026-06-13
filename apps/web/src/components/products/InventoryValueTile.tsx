import { Wallet, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import { m, staggerItem, useCountUp } from "@/lib/motion";

interface InventoryValueTileProps {
  /** Hero number — total retail value of tracked stock on hand. */
  value: number;
  /** Count of distinct products contributing to the value. */
  productCount: number;
  loading?: boolean;
}

/**
 * The single full-orange surface on the Products page (DESIGN.md §2.2).
 * Orange stays rare to stay loud — this is the only `bg-primary` tile here.
 */
export function InventoryValueTile({ value, productCount, loading = false }: InventoryValueTileProps) {
  const display = useCountUp(value);

  if (loading) {
    return (
      <div className="flex h-full min-h-[180px] flex-col gap-4 rounded-card bg-primary/80 p-6">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-10 w-32 bg-white/30" />
        <Skeleton className="mt-auto h-4 w-24 bg-white/30" />
      </div>
    );
  }

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-card bg-primary p-6 text-primary-foreground shadow-elevation-2">
        {/* Subtle depth gradient — opacity only, no layout cost */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <Wallet className="h-4 w-4" aria-hidden />
              Inventory value
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </span>
          </div>

          <p className="mt-2 tabular-nums text-4xl font-bold leading-none tracking-tight">
            {formatCurrency(display)}
          </p>

          <p className="mt-auto text-sm font-medium text-primary-foreground/85 tabular-nums">
            across {productCount.toLocaleString("en-US")} {productCount === 1 ? "product" : "products"}
          </p>
        </div>
      </div>
    </m.div>
  );
}
