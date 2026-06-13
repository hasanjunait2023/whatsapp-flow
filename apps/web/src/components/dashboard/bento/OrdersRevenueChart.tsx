import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyCompact } from "@/lib/currency";

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

interface OrdersRevenueChartProps {
  data: DailyRevenue[];
  loading?: boolean;
}

interface TooltipPayload {
  payload: DailyRevenue;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-control border bg-popover p-3 text-popover-foreground shadow-elevation-3">
      <p className="text-xs font-semibold">{point.date}</p>
      <div className="mt-1.5 space-y-1 text-xs">
        <p className="flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            Revenue
          </span>
          <span className="tabular-nums font-medium text-foreground">৳{point.revenue.toLocaleString("en-BD")}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground" aria-hidden />
            Orders
          </span>
          <span className="tabular-nums font-medium text-foreground">{point.orders}</span>
        </p>
      </div>
    </div>
  );
}

/** Signature orange + ink bar chart (DESIGN_SYSTEM §6 chart wrapper / §7). */
export function OrdersRevenueChart({ data, loading = false }: OrdersRevenueChartProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
          Orders &amp; Revenue
        </CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            Revenue
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground" aria-hidden />
            Orders
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  yAxisId="revenue"
                  tickFormatter={formatCurrencyCompact}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis yAxisId="orders" orientation="right" hide />
                <Tooltip cursor={{ fill: "hsl(var(--muted-soft))" }} content={<ChartTooltip />} />
                <Bar yAxisId="revenue" dataKey="revenue" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar yAxisId="orders" dataKey="orders" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
