import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { AccountsData } from '@/hooks/useAccounts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone, Building2, DollarSign } from 'lucide-react';

interface PaymentMethodAnalysisProps {
  data: AccountsData | null;
  loading: boolean;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

import { formatCurrency } from '@/lib/currency';

const getMethodIcon = (method: string) => {
  const normalizedMethod = method.toLowerCase();
  if (normalizedMethod.includes('bkash') || normalizedMethod.includes('nagad')) {
    return <Smartphone className="h-5 w-5" />;
  }
  if (normalizedMethod.includes('bank')) {
    return <Building2 className="h-5 w-5" />;
  }
  if (normalizedMethod.includes('card')) {
    return <CreditCard className="h-5 w-5" />;
  }
  return <DollarSign className="h-5 w-5" />;
};

const getMethodColor = (method: string, index: number) => {
  const normalizedMethod = method.toLowerCase();
  if (normalizedMethod.includes('bkash')) return '#E2136E';
  if (normalizedMethod.includes('nagad')) return '#F26522';
  if (normalizedMethod.includes('bank')) return '#3b82f6';
  return COLORS[index % COLORS.length];
};

export function PaymentMethodAnalysis({ data, loading }: PaymentMethodAnalysisProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.revenueByPaymentMethod.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No payment data available</p>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = data.revenueByPaymentMethod.reduce((sum, m) => sum + m.amount, 0);
  const totalCount = data.revenueByPaymentMethod.reduce((sum, m) => sum + m.count, 0);

  // Calculate metrics for each method
  const methodMetrics = data.revenueByPaymentMethod.map((method, index) => ({
    ...method,
    percentage: totalAmount > 0 ? ((method.amount / totalAmount) * 100).toFixed(1) : '0',
    averageSize: method.count > 0 ? method.amount / method.count : 0,
    color: getMethodColor(method.method, index)
  }));

  const chartConfig = methodMetrics.reduce((acc, method) => {
    acc[method.method] = { label: method.method, color: method.color };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">Payment Method Analysis</h2>
        <p className="text-muted-foreground">
          Breakdown of revenue by payment channel
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">From all payment methods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Verified payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalCount > 0 ? totalAmount / totalCount : 0)}
            </div>
            <p className="text-xs text-muted-foreground">Per payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.revenueByPaymentMethod.length}</div>
            <p className="text-xs text-muted-foreground">Active channels</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Distribution</CardTitle>
            <CardDescription>Percentage share by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <PieChart>
                <Pie
                  data={methodMetrics}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="amount"
                  nameKey="method"
                  label={({ method, percentage }) => `${method}: ${percentage}%`}
                >
                  {methodMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-sm">
                          <div className="font-medium">{data.method}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(data.amount)} ({data.percentage}%)
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {data.count} transactions
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Volume</CardTitle>
            <CardDescription>Amount collected per method</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={methodMetrics} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`} />
                <YAxis dataKey="method" type="category" width={100} />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-sm">
                          <div className="font-medium">{data.method}</div>
                          <div className="text-sm">
                            Amount: {formatCurrency(data.amount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Count: {data.count} | Avg: {formatCurrency(data.averageSize)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {methodMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {methodMetrics.map((method, index) => (
          <Card key={method.method}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${method.color}20` }}
                  >
                    <span style={{ color: method.color }}>
                      {getMethodIcon(method.method)}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{method.method}</CardTitle>
                </div>
                <Badge variant="secondary">{method.percentage}%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">{formatCurrency(method.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="font-medium">{method.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg. Size</span>
                  <span className="font-medium">{formatCurrency(method.averageSize)}</span>
                </div>
                {/* Progress bar showing share */}
                <div className="pt-2">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${method.percentage}%`,
                        backgroundColor: method.color
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Method Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Method Comparison</CardTitle>
          <CardDescription>Side-by-side metrics for all payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Method</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Share</th>
                  <th className="px-4 py-3 text-right font-medium">Transactions</th>
                  <th className="px-4 py-3 text-right font-medium">Avg. Size</th>
                </tr>
              </thead>
              <tbody>
                {methodMetrics.map((method) => (
                  <tr key={method.method} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: method.color }}
                        />
                        <span className="font-medium">{method.method}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(method.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="outline">{method.percentage}%</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{method.count}</td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(method.averageSize)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-bold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalAmount)}</td>
                  <td className="px-4 py-3 text-right">100%</td>
                  <td className="px-4 py-3 text-right">{totalCount}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(totalCount > 0 ? totalAmount / totalCount : 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
