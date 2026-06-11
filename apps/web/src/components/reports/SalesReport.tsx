import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportsData } from '@/hooks/useReports';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, CreditCard, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface SalesReportProps {
  data: ReportsData | null;
  loading: boolean;
  currency?: string;
  showComparison?: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  showComparison?: boolean;
  loading?: boolean;
}

function StatCard({ title, value, icon, change, showComparison, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-28" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold">{value}</span>
          {showComparison && change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${change >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesReport({ data, loading, currency = 'BDT', showComparison = false }: SalesReportProps) {
  const summary = data?.summary;
  const dailySales = data?.dailySales || [];
  const ordersByStatus = data?.ordersByStatus || [];
  const paymentStatus = data?.paymentStatus || [];
  const revenueBySource = data?.revenueBySource || [];
  const previousPeriod = data?.previousPeriod;

  // Calculate percentage changes
  const revenueChange = previousPeriod && previousPeriod.revenue > 0 
    ? ((summary?.totalRevenue || 0) - previousPeriod.revenue) / previousPeriod.revenue * 100 
    : undefined;
  const ordersChange = previousPeriod && previousPeriod.orders > 0 
    ? ((summary?.totalOrders || 0) - previousPeriod.orders) / previousPeriod.orders * 100 
    : undefined;
  const aovChange = previousPeriod && previousPeriod.aov > 0 
    ? ((summary?.averageOrderValue || 0) - previousPeriod.aov) / previousPeriod.aov * 100 
    : undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(summary?.totalRevenue || 0, currency)}
          icon={<DollarSign className="h-4 w-4" />}
          change={revenueChange}
          showComparison={showComparison}
        />
        <StatCard
          title="Total Orders"
          value={summary?.totalOrders || 0}
          icon={<ShoppingCart className="h-4 w-4" />}
          change={ordersChange}
          showComparison={showComparison}
        />
        <StatCard
          title="Average Order Value"
          value={formatCurrency(summary?.averageOrderValue || 0, currency)}
          icon={<CreditCard className="h-4 w-4" />}
          change={aovChange}
          showComparison={showComparison}
        />
        <StatCard
          title="Collection Rate"
          value={`${(summary?.collectionRate || 0).toFixed(1)}%`}
          icon={<Percent className="h-4 w-4" />}
        />
      </div>

      {/* Daily Sales Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Sales Trend</CardTitle>
          <CardDescription>Revenue and order volume over time</CardDescription>
        </CardHeader>
        <CardContent>
          {dailySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailySales}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis tickFormatter={(v) => formatCurrency(v, currency)} className="text-xs" />
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No sales data for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Status & Payment Status */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Distribution of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ status }) => status}
                    >
                      {ordersByStatus.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 w-full lg:w-auto">
                  {ordersByStatus.map((item, index) => (
                    <div key={item.status} className="flex items-center justify-between gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="capitalize">{item.status}</span>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                No order data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Revenue by payment status</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={paymentStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v, currency)} />
                  <YAxis dataKey="status" type="category" width={80} className="text-xs capitalize" />
                  <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                No payment data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Source */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Source</CardTitle>
          <CardDescription>Where your orders come from</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueBySource.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={revenueBySource}
                    dataKey="value"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ source }) => source}
                  >
                    {revenueBySource.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                  {revenueBySource.map((item, index) => (
                    <div key={item.source} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-medium capitalize">{item.source}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(item.value, currency)}</div>
                        <div className="text-sm text-muted-foreground">{item.count} orders</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No source data for this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
