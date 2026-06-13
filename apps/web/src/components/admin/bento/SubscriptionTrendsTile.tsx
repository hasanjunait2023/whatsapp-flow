import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SubscriptionTrend {
  month: string;
  new: number;
  churned: number;
}

interface SubscriptionTrendsTileProps {
  data: SubscriptionTrend[];
  loading?: boolean;
}

interface TooltipPayload {
  payload: SubscriptionTrend;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-control border bg-popover p-3 text-popover-foreground shadow-elevation-3">
      <p className="text-xs font-semibold">{point.month}</p>
      <div className="mt-1.5 space-y-1 text-xs">
        <p className="flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            New
          </span>
          <span className="tabular-nums font-medium text-foreground">{point.new}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground" aria-hidden />
            Churned
          </span>
          <span className="tabular-nums font-medium text-foreground">{point.churned}</span>
        </p>
      </div>
    </div>
  );
}

/** New vs churned subscriptions — grouped orange + ink bars (DESIGN_SYSTEM §7). */
export function SubscriptionTrendsTile({ data, loading = false }: SubscriptionTrendsTileProps) {
  const netGrowth = data.reduce((sum, d) => sum + d.new - d.churned, 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" aria-hidden />
          Subscription Trends
        </CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            New
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground" aria-hidden />
            Churned
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <>
            <p className="mb-2 text-sm text-muted-foreground">
              Net growth{" "}
              <span className="tabular-nums font-semibold text-foreground">
                {netGrowth >= 0 ? "+" : ""}
                {netGrowth}
              </span>
            </p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip cursor={{ fill: "hsl(var(--muted-soft))" }} content={<ChartTooltip />} />
                  <Bar dataKey="new" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="churned" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
