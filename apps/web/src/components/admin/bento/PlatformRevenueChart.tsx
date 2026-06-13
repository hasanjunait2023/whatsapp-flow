import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface PlatformRevenueChartProps {
  data: MonthlyRevenue[];
  loading?: boolean;
}

interface TooltipPayload {
  payload: MonthlyRevenue;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-control border bg-popover p-3 text-popover-foreground shadow-elevation-3">
      <p className="text-xs font-semibold">{point.month}</p>
      <p className="mt-1.5 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          Revenue
        </span>
        <span className="tabular-nums font-medium text-foreground">{formatCurrency(point.revenue)}</span>
      </p>
    </div>
  );
}

/** Signature orange bar chart for platform revenue over time (DESIGN_SYSTEM §6/§7). */
export function PlatformRevenueChart({ data, loading = false }: PlatformRevenueChartProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
          Revenue Overview
        </CardTitle>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          Last 6 months
        </span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickFormatter={formatCurrencyCompact}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip cursor={{ fill: "hsl(var(--muted-soft))" }} content={<ChartTooltip />} />
                <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
