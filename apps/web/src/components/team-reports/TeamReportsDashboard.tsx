import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { m, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';
import { TeamMemberStats, TeamReportsSummary } from '@/hooks/useTeamReports';
import {
  MessageSquare,
  ShoppingCart,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  Trophy,
} from 'lucide-react';

interface TeamReportsDashboardProps {
  summary: TeamReportsSummary;
  teamStats: TeamMemberStats[];
  isLoading: boolean;
}

/**
 * The single full-orange surface on the Team Reports overview (DESIGN.md §2.2).
 * Hero metric = total sales for the period — the page's loudest number.
 */
function SalesHighlightTile({
  total,
  orders,
  loading,
}: {
  total: number;
  orders: number;
  loading: boolean;
}) {
  const display = useCountUp(total);
  const avgOrder = orders > 0 ? Math.round(total / orders) : 0;

  if (loading) {
    return (
      <div className="flex h-full min-h-[148px] flex-col gap-4 rounded-card bg-primary/80 p-6">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-10 w-24 bg-white/30" />
        <Skeleton className="mt-auto h-4 w-32 bg-white/30" />
      </div>
    );
  }

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-card bg-primary p-6 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <DollarSign className="h-4 w-4" aria-hidden />
              Total sales
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {orders.toLocaleString('en-US')} orders
            </span>
          </div>
          <p className="mt-2 tabular-nums text-4xl font-bold leading-none tracking-tight md:text-5xl">
            ৳{display.toLocaleString('en-US')}
          </p>
          <span className="mt-auto pt-3 text-xs text-primary-foreground/80">
            ৳{avgOrder.toLocaleString('en-US')} avg order value
          </span>
        </div>
      </div>
    </m.div>
  );
}

export function TeamReportsDashboard({ summary, teamStats, isLoading }: TeamReportsDashboardProps) {
  const messagesPerMember =
    summary.totalMessagesSent / Math.max(summary.totalTeamMembers, 1);

  const totalCustomers = teamStats.reduce((sum, m) => sum + m.customersAssigned, 0);
  const teamConversionRate =
    totalCustomers > 0 ? (summary.totalOrdersCreated / totalCustomers) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* KPI strip — the ONE orange tile (total sales) + soft stat cards */}
      <m.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
      >
        <div className="col-span-2 lg:col-span-1">
          <SalesHighlightTile
            total={summary.totalSalesAmount}
            orders={summary.totalOrdersCreated}
            loading={isLoading}
          />
        </div>
        <m.div variants={staggerItem}>
          <KpiCard
            title="Team members"
            value={summary.totalTeamMembers}
            icon={Users}
            tone="info"
            trendLabel="active members"
            loading={isLoading}
          />
        </m.div>
        <m.div variants={staggerItem}>
          <KpiCard
            title="Messages sent"
            value={summary.totalMessagesSent}
            icon={MessageSquare}
            tone="primary"
            trendLabel={`${messagesPerMember.toFixed(1)} per member`}
            loading={isLoading}
          />
        </m.div>
        <m.div variants={staggerItem}>
          <KpiCard
            title="Orders created"
            value={summary.totalOrdersCreated}
            icon={ShoppingCart}
            tone="success"
            trendLabel="this period"
            loading={isLoading}
          />
        </m.div>
      </m.div>

      {isLoading ? (
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-12">
          <Skeleton className="h-[180px] rounded-card lg:col-span-7" />
          <Skeleton className="h-[180px] rounded-card lg:col-span-5" />
        </div>
      ) : (
        <>
          {/* Top Performer + quick stats */}
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-12">
            {summary.topPerformer && (
              <Card className="lg:col-span-7">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex h-8 w-8 items-center justify-center rounded-control bg-warning-soft text-warning">
                      <Trophy className="h-4 w-4" aria-hidden />
                    </span>
                    Top performer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={summary.topPerformer.avatarUrl || undefined} />
                      <AvatarFallback className="text-lg">
                        {summary.topPerformer.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">
                        {summary.topPerformer.name}
                      </h3>
                      <p className="text-sm capitalize text-muted-foreground">
                        {summary.topPerformer.role}
                      </p>
                    </div>
                    <Badge variant="success-soft" className="shrink-0 tabular-nums">
                      {summary.topPerformer.kpiScore.toFixed(0)}% KPI
                    </Badge>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-control bg-muted/50 p-3 text-center">
                      <div className="tabular-nums text-xl font-bold text-foreground">
                        {summary.topPerformer.messagesSent.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Messages</div>
                    </div>
                    <div className="rounded-control bg-muted/50 p-3 text-center">
                      <div className="tabular-nums text-xl font-bold text-foreground">
                        {summary.topPerformer.ordersCreated.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Orders</div>
                    </div>
                    <div className="rounded-control bg-muted/50 p-3 text-center">
                      <div className="tabular-nums text-xl font-bold text-foreground">
                        ৳{summary.topPerformer.totalSalesAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Sales</div>
                    </div>
                    <div className="rounded-control bg-muted/50 p-3 text-center">
                      <div className="tabular-nums text-xl font-bold text-foreground">
                        {summary.topPerformer.conversionRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Conversion</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-5 sm:gap-6 lg:col-span-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" aria-hidden />
                    Avg response time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="tabular-nums text-3xl font-bold tracking-tight text-foreground">
                    {summary.avgTeamResponseTime.toFixed(1)} min
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Average team response time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <TrendingUp className="h-4 w-4" aria-hidden />
                    Team conversion rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="tabular-nums text-3xl font-bold tracking-tight text-foreground">
                    {teamConversionRate.toFixed(1)}%
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {summary.totalOrdersCreated} orders from {totalCustomers} customers
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
