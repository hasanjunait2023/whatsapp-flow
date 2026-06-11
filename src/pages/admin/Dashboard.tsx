import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Building2, CreditCard, MessageSquare, Receipt, Smartphone, Users, DollarSign, RefreshCw, MessagesSquare } from 'lucide-react';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { SubscriptionTrendChart } from '@/components/admin/SubscriptionTrendChart';
import { TopTenantsTable } from '@/components/admin/TopTenantsTable';
import { FeatureOverridesWidget } from '@/components/admin/FeatureOverridesWidget';
import { ExternalSalesCard } from '@/components/admin/ExternalSalesCard';
import { ResponsivePageHeader } from '@/components/admin/ResponsivePageHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { stats, revenueData, subscriptionTrends, topTenants, tenantsWithOverrides, loading, refetch } = useAdminDashboard();
  const isMobile = useIsMobile();

  const statCards = [
    {
      title: 'Total Revenue',
      value: stats ? `৳${stats.totalRevenue.toLocaleString()}` : '৳0',
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Total Tenants',
      value: stats?.totalTenants || 0,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Active Subscriptions',
      value: stats?.activeSubscriptions || 0,
      icon: CreditCard,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Trial Subscriptions',
      value: stats?.trialSubscriptions || 0,
      icon: Users,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Suspended',
      value: stats?.suspendedSubscriptions || 0,
      icon: Building2,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Pending Payments',
      value: stats?.pendingPayments || 0,
      icon: Receipt,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Messages (This Month)',
      value: stats?.totalMessages || 0,
      icon: MessageSquare,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Conversations (This Month)',
      value: stats?.totalConversations || 0,
      icon: MessagesSquare,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: 'Active Instances',
      value: stats?.activeInstances || 0,
      icon: Smartphone,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <ResponsivePageHeader
          title="Admin Dashboard"
          description="System overview and management"
          actions={
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          }
        />

        {/* Stats Grid - Scrollable on mobile, grid on desktop */}
        {isMobile ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-2">
              {statCards.map((stat) => (
                <Card key={stat.title} className="min-w-[160px] shrink-0">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 p-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={cn('p-1.5 rounded-lg', stat.bgColor)}>
                      <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {loading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className="text-xl font-bold">
                        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                    <stat.icon className={cn('h-4 w-4', stat.color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          {loading ? (
            <>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] md:h-[250px] w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] md:h-[250px] w-full" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <RevenueChart data={revenueData} currency="BDT" />
              <SubscriptionTrendChart data={subscriptionTrends} />
            </>
          )}
        </div>

        {/* Top Tenants & Feature Overrides */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          {loading ? (
            <>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <TopTenantsTable tenants={topTenants} />
              <FeatureOverridesWidget tenants={tenantsWithOverrides} loading={loading} />
            </>
          )}
        </div>

        {/* External Sales */}
        <ExternalSalesCard />

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <Button variant="outline" size={isMobile ? 'sm' : 'default'} asChild className="flex-1 min-w-[140px] sm:flex-none">
                <a href="/admin/payments">
                  <Receipt className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Review </span>Payments ({stats?.pendingPayments || 0})
                </a>
              </Button>
              <Button variant="outline" size={isMobile ? 'sm' : 'default'} asChild className="flex-1 min-w-[140px] sm:flex-none">
                <a href="/admin/subscriptions">
                  <CreditCard className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Manage </span>Suspended ({stats?.suspendedSubscriptions || 0})
                </a>
              </Button>
              <Button variant="outline" size={isMobile ? 'sm' : 'default'} asChild className="flex-1 min-w-[140px] sm:flex-none">
                <a href="/admin/plans">
                  <Building2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Configure </span>Plans
                </a>
              </Button>
              <Button variant="outline" size={isMobile ? 'sm' : 'default'} asChild className="flex-1 min-w-[140px] sm:flex-none">
                <a href="/admin/tenants">
                  <Building2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Manage </span>Tenants
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
