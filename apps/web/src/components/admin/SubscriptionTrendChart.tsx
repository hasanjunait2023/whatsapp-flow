import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface SubscriptionTrendData {
  month: string;
  new: number;
  churned: number;
}

interface SubscriptionTrendChartProps {
  data: SubscriptionTrendData[];
}

const chartConfig = {
  new: {
    label: 'New',
    color: 'hsl(142, 76%, 36%)',
  },
  churned: {
    label: 'Churned',
    color: 'hsl(0, 84%, 60%)',
  },
};

export function SubscriptionTrendChart({ data }: SubscriptionTrendChartProps) {
  const totalNew = data.reduce((sum, d) => sum + d.new, 0);
  const totalChurned = data.reduce((sum, d) => sum + d.churned, 0);
  const netGrowth = totalNew - totalChurned;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscription Trends</CardTitle>
            <CardDescription>New vs churned subscriptions</CardDescription>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${netGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {netGrowth >= 0 ? '+' : ''}{netGrowth}
            </p>
            <p className="text-sm text-muted-foreground">Net growth</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar 
                dataKey="new" 
                fill="hsl(142, 76%, 36%)" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="churned" 
                fill="hsl(0, 84%, 60%)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
