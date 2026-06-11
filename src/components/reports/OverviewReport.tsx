import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportsData } from '@/hooks/useReports';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Percent,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface OverviewReportProps {
  data: ReportsData | null;
  loading: boolean;
  currency?: string;
  showComparison?: boolean;
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-destructive" />
            )}
            <span className={trend >= 0 ? 'text-emerald-500' : 'text-destructive'}>
              {Math.abs(trend).toFixed(1)}%
            </span>
            {trendLabel && <span className="ml-1">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewReport({ data, loading, currency = 'BDT', showComparison = true }: OverviewReportProps) {
  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={loading ? '' : formatCurrency(data?.summary.totalRevenue || 0, currency)}
          icon={DollarSign}
          trend={showComparison ? data?.summary.revenueChange : undefined}
          trendLabel="vs last period"
          loading={loading}
        />
        <StatCard
          title="Total Orders"
          value={loading ? '' : (data?.summary.totalOrders || 0).toString()}
          icon={ShoppingCart}
          trend={showComparison ? data?.summary.ordersChange : undefined}
          trendLabel="vs last period"
          loading={loading}
        />
        <StatCard
          title="Average Order Value"
          value={loading ? '' : formatCurrency(data?.summary.averageOrderValue || 0, currency)}
          icon={TrendingUp}
          trend={showComparison ? data?.summary.aovChange : undefined}
          trendLabel="vs last period"
          loading={loading}
        />
        <StatCard
          title="Gross Profit Margin"
          value={loading ? '' : `${(data?.summary.grossProfitMargin || 0).toFixed(1)}%`}
          icon={Percent}
          loading={loading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="New Customers"
          value={loading ? '' : (data?.summary.newCustomers || 0).toString()}
          icon={Users}
          trend={showComparison ? data?.summary.customersChange : undefined}
          trendLabel="vs last period"
          loading={loading}
        />
        <StatCard
          title="Messages Sent"
          value={loading ? '' : (data?.summary.messagesSent || 0).toString()}
          icon={MessageSquare}
          trend={showComparison ? data?.summary.messagesChange : undefined}
          trendLabel="vs last period"
          loading={loading}
        />
        <StatCard
          title="Active Conversations"
          value={loading ? '' : (data?.summary.activeConversations || 0).toString()}
          icon={Users}
          trend={showComparison ? data?.summary.conversationsChange : undefined}
          trendLabel="vs last period"
          loading={loading}
        />
        <StatCard
          title="Open Complaints"
          value={loading ? '' : (data?.summary.openComplaints || 0).toString()}
          icon={AlertTriangle}
          loading={loading}
        />
        <StatCard
          title="Collection Rate"
          value={loading ? '' : `${(data?.summary.collectionRate || 0).toFixed(1)}%`}
          icon={DollarSign}
          loading={loading}
        />
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profit & Loss Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">{formatCurrency(data?.profitLoss.revenue || 0, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">COGS</span>
                  <span className="font-medium text-destructive">-{formatCurrency(data?.profitLoss.cogs || 0, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Profit</span>
                  <span className="font-medium">{formatCurrency(data?.profitLoss.grossProfit || 0, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expenses</span>
                  <span className="font-medium text-destructive">-{formatCurrency(data?.profitLoss.operatingExpenses || 0, currency)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Net Profit</span>
                  <span className={`font-bold ${(data?.profitLoss.netProfit || 0) >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {formatCurrency(data?.profitLoss.netProfit || 0, currency)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {data?.topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                      <span className="text-sm truncate max-w-[150px]">{product.name}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(product.revenue, currency)}</span>
                  </div>
                ))}
                {(!data?.topProducts || data.topProducts.length === 0) && (
                  <p className="text-sm text-muted-foreground">No products sold</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {data?.topCustomers.slice(0, 5).map((customer, index) => (
                  <div key={customer.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                      <span className="text-sm truncate max-w-[150px]">{customer.name}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(customer.totalSpent, currency)}</span>
                  </div>
                ))}
                {(!data?.topCustomers || data.topCustomers.length === 0) && (
                  <p className="text-sm text-muted-foreground">No customer data</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
