import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsSummaryCards } from '@/components/analytics/StatCards';
import { MessageVolumeChart } from '@/components/analytics/MessageVolumeChart';
import { ResponseTimeChart } from '@/components/analytics/ResponseTimeChart';
import { TeamPerformanceChart } from '@/components/analytics/TeamPerformanceChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, BarChart3 } from 'lucide-react';

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { 
    messageVolume, 
    responseTimes, 
    teamPerformance, 
    summary, 
    loading, 
    refetch 
  } = useAnalytics(days);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Track your messaging performance and team activity
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : summary ? (
          <AnalyticsSummaryCards
            totalMessages={summary.totalMessages}
            totalContacts={summary.totalContacts}
            totalConversations={summary.totalConversations}
            avgResponseTime={summary.avgResponseTime}
            activeConversations={summary.activeConversations}
            messagesTrend={summary.messagesTrend}
            conversationsTrend={summary.conversationsTrend}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No analytics data yet</h3>
            <p className="text-muted-foreground max-w-sm">
              Start messaging to see your analytics data appear here.
            </p>
          </div>
        )}

        {/* Charts */}
        {!loading && summary && (
          <div data-tour="analytics-charts" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <MessageVolumeChart data={messageVolume} />
              <ResponseTimeChart data={responseTimes} />
            </div>

            <TeamPerformanceChart data={teamPerformance} />
          </div>
        )}

        {loading && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-[380px] rounded-lg" />
              <Skeleton className="h-[380px] rounded-lg" />
            </div>
            <Skeleton className="h-[400px] rounded-lg" />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
