import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  ShoppingCart,
  Wallet,
  MessageCircle,
  Facebook,
  Plug,
  UserPlus,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useTeamPermissions } from '@/hooks/useTeamPermissions';
import { useProfile } from '@/hooks/useProfile';
import { useDemoSession } from '@/hooks/useDemoSession';
import { useInstances } from '@/hooks/useInstances';
import { formatCurrency } from '@/lib/currency';
import { m, pageEnter, staggerContainer } from '@/lib/motion';

import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { EarningsHighlightTile } from '@/components/dashboard/bento/EarningsHighlightTile';
import { OrdersRevenueChart } from '@/components/dashboard/bento/OrdersRevenueChart';
import { OrderStatusTile } from '@/components/dashboard/bento/OrderStatusTile';
import { RecentConversationsTile } from '@/components/dashboard/bento/RecentConversationsTile';

import { TeamLeaderboard } from '@/components/dashboard/TeamLeaderboard';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { ComplaintsWidget } from '@/components/dashboard/ComplaintsWidget';
import { ActivityHeatmap } from '@/components/team-reports/ActivityHeatmap';
import { ActiveTeamWidget } from '@/components/dashboard/ActiveTeamWidget';
import { SetupBanner } from '@/components/onboarding/SetupBanner';
import { DemoPotentialCard } from '@/components/demo/DemoPotentialCard';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { profile } = useProfile();
  const { canViewRevenue, isOwnerOrManager } = useTeamPermissions();
  const { isDemoTenant } = useDemoSession();
  const { instances, loading: instancesLoading } = useInstances();
  const {
    orders,
    messages,
    team,
    customers,
    attentionItems,
    revenueHistory,
    loading,
    error,
  } = useDashboardAnalytics();

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const today = format(new Date(), 'EEEE, d MMMM');

  const activeInstances = useMemo(
    () => instances.filter((i) => i.status === 'active').length,
    [instances],
  );
  const totalInstances = instances.length;

  // Reuse the analytics WA/FB unread split: total unread minus FB portion isn't
  // separated in the hook, so we surface the combined messaging signals available.
  const ordersSpark = useMemo(
    () => revenueHistory.map((d) => ({ date: d.date, orders: d.orders })),
    [revenueHistory],
  );

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load analytics data. Some metrics may be unavailable.
          </div>
        )}

        {/* Slot for TourStartCard to portal into */}
        <div data-tour-card-slot />

        <SetupBanner />

        {/* Greeting header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening today · {today}
          </p>
        </header>

        {/* KPI strip */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <KpiCard
            title="Orders today"
            value={orders.ordersToday}
            icon={ShoppingCart}
            tone="primary"
            trendPct={orders.ordersTodayChange}
            trendLabel="vs yesterday"
            loading={loading}
          />
          {canViewRevenue && (
            <KpiCard
              title="Revenue today"
              value={orders.revenueToday}
              format={(v) => formatCurrency(v)}
              icon={Wallet}
              tone="success"
              trendPct={orders.revenueTodayChange}
              trendLabel="vs yesterday"
              loading={loading}
            />
          )}
          <KpiCard
            title="Unread messages"
            value={messages.unreadMessages}
            icon={MessageCircle}
            tone="info"
            loading={loading}
          />
          <KpiCard
            title="New contacts"
            value={customers.newCustomersThisWeek}
            icon={UserPlus}
            tone="warning"
            trendPct={
              customers.newCustomersLastWeek > 0
                ? Math.round(
                    ((customers.newCustomersThisWeek - customers.newCustomersLastWeek) /
                      customers.newCustomersLastWeek) *
                      100,
                  )
                : 0
            }
            trendLabel="vs last week"
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
          {/* Primary: orders & revenue bar chart */}
          <div className="lg:col-span-8">
            <OrdersRevenueChart data={revenueHistory} loading={loading} />
          </div>

          {/* The single full-orange surface */}
          <div className="lg:col-span-4">
            <EarningsHighlightTile
              ordersToday={orders.ordersToday}
              changePct={orders.ordersTodayChange}
              spark={ordersSpark}
              loading={loading}
            />
          </div>

          {/* Secondary stat tiles */}
          <div className="lg:col-span-3">
            <KpiCard
              title="Active instances"
              value={activeInstances}
              format={() => `${activeInstances}/${totalInstances}`}
              icon={Plug}
              tone={activeInstances > 0 ? 'success' : 'destructive'}
              loading={instancesLoading}
              accessory={
                activeInstances > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success/60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    live
                  </span>
                ) : undefined
              }
            />
          </div>
          <div className="lg:col-span-3">
            <KpiCard
              title="Conversations today"
              value={messages.conversationsToday}
              icon={Facebook}
              tone="info"
              trendPct={messages.conversationsTodayChange}
              trendLabel="vs yesterday"
              loading={loading}
            />
          </div>

          {/* Order status pipeline */}
          <div className="content-auto lg:col-span-6">
            <OrderStatusTile
              pending={orders.pendingOrders}
              confirmed={orders.confirmedOrders}
              shipped={orders.shippedOrders}
              delivered={orders.deliveredOrders}
              cancelled={orders.cancelledOrders}
              loading={loading}
            />
          </div>

          {/* Recent conversations table */}
          <div className="content-auto lg:col-span-7">
            <RecentConversationsTile />
          </div>

          {/* Team activity */}
          <div className="content-auto space-y-5 md:space-y-6 lg:col-span-5">
            {isDemoTenant && <DemoPotentialCard />}
            {isOwnerOrManager && !isDemoTenant && <ActiveTeamWidget />}
            <TeamLeaderboard performers={team.topPerformers} loading={loading} />
            {isOwnerOrManager && !isDemoTenant && (
              <AttentionCard items={attentionItems} loading={loading} />
            )}
          </div>

          {/* Below-the-fold extras */}
          <div className="content-auto lg:col-span-12">
            <ComplaintsWidget />
          </div>
          {isOwnerOrManager && !isDemoTenant && (
            <div className="content-auto lg:col-span-12">
              <ActivityHeatmap />
            </div>
          )}
        </m.div>
      </m.div>
    </DashboardLayout>
  );
}
