import { useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import {
  Building2,
  CreditCard,
  MessageSquare,
  MessagesSquare,
  Smartphone,
  Receipt,
  Users,
  RefreshCw,
} from 'lucide-react';
import { m, pageEnter, staggerContainer } from '@/lib/motion';
import { cn } from '@/lib/utils';

import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { PlatformRevenueHighlightTile } from '@/components/admin/bento/PlatformRevenueHighlightTile';
import { PlatformRevenueChart } from '@/components/admin/bento/PlatformRevenueChart';
import { SubscriptionTrendsTile } from '@/components/admin/bento/SubscriptionTrendsTile';
import { TopTenantsTile } from '@/components/admin/bento/TopTenantsTile';
import { FeatureOverridesWidget } from '@/components/admin/FeatureOverridesWidget';
import { ExternalSalesCard } from '@/components/admin/ExternalSalesCard';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboard() {
  const { stats, revenueData, subscriptionTrends, topTenants, tenantsWithOverrides, loading, refetch } =
    useAdminDashboard();
  const { profile } = useProfile();

  const firstName = profile?.full_name?.split(' ')[0] || 'admin';

  // Revenue trend: current vs previous month, derived from the same revenueData series.
  const revenueChangePct = useMemo(() => {
    const current = revenueData[revenueData.length - 1]?.revenue ?? 0;
    const previous = revenueData[revenueData.length - 2]?.revenue ?? 0;
    if (previous <= 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [revenueData]);

  return (
    <AdminLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Greeting header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Platform overview across all tenants &amp; subscriptions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="min-h-[44px] self-start sm:self-auto sm:min-h-0"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
        </header>

        {/* KPI strip — stat cards + the ONE orange tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
        >
          <KpiCard
            title="Total tenants"
            value={stats?.totalTenants ?? 0}
            icon={Building2}
            tone="info"
            loading={loading}
          />
          <KpiCard
            title="Active subscriptions"
            value={stats?.activeSubscriptions ?? 0}
            icon={CreditCard}
            tone="success"
            loading={loading}
          />
          <KpiCard
            title="Messages this month"
            value={stats?.totalMessages ?? 0}
            icon={MessageSquare}
            tone="primary"
            loading={loading}
          />
          <KpiCard
            title="Conversations"
            value={stats?.totalConversations ?? 0}
            icon={MessagesSquare}
            tone="info"
            loading={loading}
          />
          <KpiCard
            title="Active instances"
            value={stats?.activeInstances ?? 0}
            icon={Smartphone}
            tone="success"
            loading={loading}
          />
          <KpiCard
            title="Pending payments"
            value={stats?.pendingPayments ?? 0}
            icon={Receipt}
            tone={stats && stats.pendingPayments > 0 ? 'warning' : 'success'}
            loading={loading}
          />
        </m.div>

        {/* BENTO GRID — 12-col asymmetric */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12"
        >
          {/* Primary: platform revenue bar chart */}
          <div className="lg:col-span-8">
            <PlatformRevenueChart data={revenueData} loading={loading} />
          </div>

          {/* The single full-orange surface — total revenue focal KPI */}
          <div className="lg:col-span-4">
            <PlatformRevenueHighlightTile
              totalRevenue={stats?.totalRevenue ?? 0}
              changePct={revenueChangePct}
              spark={revenueData}
              loading={loading}
            />
          </div>

          {/* Secondary subscription-health stat tiles */}
          <div className="lg:col-span-3">
            <KpiCard
              title="Trial subscriptions"
              value={stats?.trialSubscriptions ?? 0}
              icon={Users}
              tone="info"
              loading={loading}
            />
          </div>
          <div className="lg:col-span-3">
            <KpiCard
              title="Suspended"
              value={stats?.suspendedSubscriptions ?? 0}
              icon={Building2}
              tone={stats && stats.suspendedSubscriptions > 0 ? 'destructive' : 'success'}
              loading={loading}
            />
          </div>

          {/* Subscription trend chart */}
          <div className="content-auto lg:col-span-6">
            <SubscriptionTrendsTile data={subscriptionTrends} loading={loading} />
          </div>

          {/* Top tenants table */}
          <div className="content-auto lg:col-span-7">
            <TopTenantsTile tenants={topTenants} loading={loading} />
          </div>

          {/* Feature overrides */}
          <div className="content-auto lg:col-span-5">
            <FeatureOverridesWidget tenants={tenantsWithOverrides} loading={loading} />
          </div>

          {/* External sales */}
          <div className="content-auto lg:col-span-12">
            <ExternalSalesCard />
          </div>
        </m.div>
      </m.div>
    </AdminLayout>
  );
}
