import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  MessageVolumeCard,
  ResponseTimeCard,
  TeamPerformanceCard,
} from '@/components/analytics/AnalyticsCharts';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpRight,
  BarChart3,
  Clock,
  MessageSquare,
  RefreshCw,
  Radio,
  Users,
} from 'lucide-react';
import { m, pageEnter, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';

function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * The single full-orange surface on the Analytics page (DESIGN.md §2.2).
 * Hero metric = total messages in the selected period — the page's loudest number.
 */
function MessagesHighlightTile({
  total,
  trend,
  spark,
  loading,
}: {
  total: number;
  trend: number;
  spark: { sent: number; received: number }[];
  loading: boolean;
}) {
  const display = useCountUp(total);

  if (loading) {
    return (
      <div className="flex h-full min-h-[148px] flex-col gap-4 rounded-card bg-primary/80 p-6">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-10 w-24 bg-white/30" />
        <Skeleton className="mt-auto h-4 w-32 bg-white/30" />
      </div>
    );
  }

  const isUp = trend >= 0;
  // Tiny inline sparkline from the volume series — opacity-only, no layout cost.
  const points = spark.slice(-14).map((d) => d.sent + d.received);
  const max = Math.max(1, ...points);

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-card bg-primary p-6 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        {points.length > 1 && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex h-16 items-end gap-px opacity-40">
            {points.map((v, i) => (
              <span
                key={i}
                className="flex-1 rounded-t-sm bg-primary-foreground"
                style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
              />
            ))}
          </div>
        )}
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <MessageSquare className="h-4 w-4" aria-hidden />
              Total messages
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {isUp && <ArrowUpRight className="h-3 w-3" aria-hidden />}
              {`${trend > 0 ? '+' : ''}${trend}%`}
            </span>
          </div>
          <p className="mt-2 tabular-nums text-4xl font-bold leading-none tracking-tight md:text-5xl">
            {display.toLocaleString('en-US')}
          </p>
          <span className="mt-auto pt-3 text-xs text-primary-foreground/80">vs the previous period</span>
        </div>
      </div>
    </m.div>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const {
    messageVolume,
    responseTimes,
    teamPerformance,
    summary,
    loading,
    refetch,
  } = useAnalytics(days);

  const hasData = !loading && summary !== null;

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5 space-y-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Track your messaging performance and team activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={refetch} disabled={loading} aria-label="Refresh analytics">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        {/* KPI strip — the ONE orange tile (total messages) + soft stat cards */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5"
        >
          <div className="col-span-2 xl:col-span-1">
            <MessagesHighlightTile
              total={summary?.totalMessages ?? 0}
              trend={summary?.messagesTrend ?? 0}
              spark={messageVolume}
              loading={loading}
            />
          </div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Conversations"
              value={summary?.totalConversations ?? 0}
              icon={Users}
              tone="info"
              trendPct={summary?.conversationsTrend}
              trendLabel={summary ? 'vs last period' : undefined}
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Active now"
              value={summary?.activeConversations ?? 0}
              icon={Radio}
              tone="success"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Contacts"
              value={summary?.totalContacts ?? 0}
              icon={Users}
              tone="primary"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Avg response"
              value={summary?.avgResponseTime ?? 0}
              format={formatResponseTime}
              icon={Clock}
              tone="warning"
              loading={loading}
            />
          </m.div>
        </m.div>

        {/* Bento body */}
        {loading ? (
          <div className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
              <Skeleton className="h-[360px] rounded-card lg:col-span-7" />
              <Skeleton className="h-[360px] rounded-card lg:col-span-5" />
            </div>
            <Skeleton className="h-[420px] rounded-card" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-border bg-card py-16 text-center shadow-elevation-1">
            <span className="flex h-12 w-12 items-center justify-center rounded-control bg-accent text-primary">
              <BarChart3 className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">No analytics data yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Start messaging to see your analytics appear here.
            </p>
          </div>
        ) : (
          <div data-tour="analytics-charts" className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
              <MessageVolumeCard data={messageVolume} className="lg:col-span-7" />
              <ResponseTimeCard data={responseTimes} className="lg:col-span-5" />
            </div>
            <TeamPerformanceCard data={teamPerformance} />
          </div>
        )}
      </m.div>
    </DashboardLayout>
  );
}
