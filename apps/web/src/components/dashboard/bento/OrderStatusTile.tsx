import { ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderStatusTileProps {
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  loading?: boolean;
}

type Row = { label: string; value: number; bar: string; track: string };

/** Order pipeline as status-soft progress bars (DESIGN_SYSTEM §7 order status). */
export function OrderStatusTile({ pending, confirmed, shipped, delivered, cancelled, loading = false }: OrderStatusTileProps) {
  const rows: Row[] = [
    { label: "Pending", value: pending, bar: "bg-warning", track: "bg-warning-soft" },
    { label: "Confirmed", value: confirmed, bar: "bg-info", track: "bg-info-soft" },
    { label: "Shipped", value: shipped, bar: "bg-primary", track: "bg-accent" },
    { label: "Delivered", value: delivered, bar: "bg-success", track: "bg-success-soft" },
    { label: "Cancelled", value: cancelled, bar: "bg-destructive", track: "bg-destructive-soft" },
  ];

  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-5 w-5 text-primary" aria-hidden />
          Order Status
        </CardTitle>
        {!loading && <span className="tabular-nums text-xs text-muted-foreground">{total} total</span>}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading
          ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)
          : rows.map((row) => {
              const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
              return (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{row.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.value} <span className="text-xs">({pct}%)</span>
                    </span>
                  </div>
                  <div
                    className={`h-2 w-full overflow-hidden rounded-full ${row.track}`}
                    role="progressbar"
                    aria-label={`${row.label} orders`}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
      </CardContent>
    </Card>
  );
}
