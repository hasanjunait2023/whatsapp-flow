import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Package } from 'lucide-react';

interface OrderStatusChartProps {
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  loading?: boolean;
}

const COLORS = {
  pending: 'hsl(var(--warning))',
  confirmed: 'hsl(var(--primary))',
  shipped: 'hsl(210, 100%, 50%)',
  delivered: 'hsl(142, 76%, 36%)',
  cancelled: 'hsl(var(--destructive))',
};

export function OrderStatusChart({
  pending,
  confirmed,
  shipped,
  delivered,
  cancelled,
  loading,
}: OrderStatusChartProps) {
  const data = [
    { name: 'Pending', value: pending, color: COLORS.pending },
    { name: 'Confirmed', value: confirmed, color: COLORS.confirmed },
    { name: 'Shipped', value: shipped, color: COLORS.shipped },
    { name: 'Delivered', value: delivered, color: COLORS.delivered },
    { name: 'Cancelled', value: cancelled, color: COLORS.cancelled },
  ].filter(d => d.value > 0);

  const total = pending + confirmed + shipped + delivered + cancelled;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-primary" />
            Order Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No orders yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-5 w-5 text-primary" />
          Order Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-2">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.value} orders ({Math.round((data.value / total) * 100)}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
