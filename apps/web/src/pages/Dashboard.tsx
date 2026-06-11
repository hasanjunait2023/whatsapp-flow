import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useTeamPermissions } from '@/hooks/useTeamPermissions';
import { useProfile } from '@/hooks/useProfile';
import { useDemoSession } from '@/hooks/useDemoSession';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart';
import { TeamLeaderboard } from '@/components/dashboard/TeamLeaderboard';
import { OrderStatusChart } from '@/components/dashboard/OrderStatusChart';
import { BusinessGrowthCard } from '@/components/dashboard/BusinessGrowthCard';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ComplaintsWidget } from '@/components/dashboard/ComplaintsWidget';
import { ActivityHeatmap } from '@/components/team-reports/ActivityHeatmap';
import { ActiveTeamWidget } from '@/components/dashboard/ActiveTeamWidget';
import { SetupBanner } from '@/components/onboarding/SetupBanner';
import { DemoPotentialCard } from '@/components/demo/DemoPotentialCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, ArrowRight, Plus } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useProfile();
  const { canViewRevenue, isOwnerOrManager } = useTeamPermissions();
  const { isDemoTenant } = useDemoSession();
  const {
    orders,
    messages,
    team,
    customers,
    attentionItems,
    revenueHistory,
    loading,
  } = useDashboardAnalytics();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Slot for TourStartCard to portal into */}
        <div data-tour-card-slot />
        
        {/* Setup Banner */}
        <SetupBanner />
        
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8">
          <div className="relative z-10">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's your business overview for today
            </p>
            <div className="mt-4">
              <Button variant="premium" asChild>
                <Link to="/inbox">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Go to Inbox
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />
        </div>

        {/* Stats Row */}
        <DashboardStats
          ordersToday={orders.ordersToday}
          ordersTodayChange={orders.ordersTodayChange}
          revenueToday={orders.revenueToday}
          revenueTodayChange={orders.revenueTodayChange}
          pendingOrders={orders.pendingOrders}
          messagesToday={messages.messagesToday}
          messagesTodayChange={messages.messagesTodayChange}
          conversationsToday={messages.conversationsToday}
          conversationsTodayChange={messages.conversationsTodayChange}
          avgResponseTime={messages.avgResponseTime}
          activeAgents={team.activeAgents}
          totalAgents={team.totalAgents}
          loading={loading}
          canViewRevenue={canViewRevenue}
        />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {canViewRevenue && (
              <RevenueTrendChart data={revenueHistory} loading={loading} />
            )}
            
            <div className="grid gap-6 md:grid-cols-2">
              <OrderStatusChart
                pending={orders.pendingOrders}
                confirmed={orders.confirmedOrders}
                shipped={orders.shippedOrders}
                delivered={orders.deliveredOrders}
                cancelled={orders.cancelledOrders}
                loading={loading}
              />
              <RecentActivity loading={loading} />
            </div>

            {/* Complaints Widget */}
            <ComplaintsWidget />

            {/* Team Activity Heatmap - Visible to Owners/Managers */}
            {isOwnerOrManager && !isDemoTenant && (
              <ActivityHeatmap />
            )}
          </div>

          {/* Right Column - Widgets */}
          <div className="space-y-6">
            {/* Demo Potential Card - Show for demo users */}
            {isDemoTenant && <DemoPotentialCard />}
            
            {/* Active Team Widget - Real-time presence */}
            {isOwnerOrManager && !isDemoTenant && (
              <ActiveTeamWidget />
            )}
            
            {isOwnerOrManager && !isDemoTenant && (
              <AttentionCard items={attentionItems} loading={loading} />
            )}
            
            <TeamLeaderboard performers={team.topPerformers} loading={loading} />
            
            {canViewRevenue && (
              <BusinessGrowthCard
                newCustomersThisWeek={customers.newCustomersThisWeek}
                newCustomersLastWeek={customers.newCustomersLastWeek}
                monthlyRevenue={orders.monthlyRevenue}
                monthlyRevenueChange={orders.monthlyRevenueChange}
                collectionRate={orders.collectionRate}
                loading={loading}
              />
            )}

            {/* CTA Card */}
            <Card className="overflow-hidden bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-2">Ready to scale?</h3>
                <p className="text-muted-foreground text-xs mb-4">
                  Connect more instances and automate your workflow.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/billing">View Plans</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/instances">
                      <Plus className="mr-1 h-3 w-3" />
                      Add Instance
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
