import { useState } from 'react';
// Team Reports Page - v2 with Analytics
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamReports, ReportPeriod } from '@/hooks/useTeamReports';
import { TeamReportsDashboard } from '@/components/team-reports/TeamReportsDashboard';
import { TeamPerformanceTable } from '@/components/team-reports/TeamPerformanceTable';
import { TeamLeaderboard } from '@/components/team-reports/TeamLeaderboard';
import { KPITargetManager } from '@/components/team-reports/KPITargetManager';
import { TeamActivityTimeline } from '@/components/team-reports/TeamActivityTimeline';
import { ReportPeriodSelector } from '@/components/team-reports/ReportPeriodSelector';
import { ActivityHeatmap } from '@/components/team-reports/ActivityHeatmap';
import { WorkSessionList } from '@/components/team-reports/WorkSessionCard';
import { ProductivityMetricsCard } from '@/components/team-reports/ProductivityMetrics';
import { AttendanceInsights } from '@/components/team-reports/AttendanceInsights';
import { useTeamWorkSessions } from '@/hooks/useTeamWorkSessions';
import { useTenant } from '@/hooks/useTenant';

export default function TeamReports() {
  const [period, setPeriod] = useState<ReportPeriod>('today');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const { isOwner, isManager } = useTenant();

  const { 
    teamStats, 
    summary, 
    kpiTargets, 
    activityLogs, 
    isLoading,
    setKPITarget,
    deleteKPITarget,
  } = useTeamReports(period, customStart, customEnd);

  const { todaySessions, loading: sessionsLoading } = useTeamWorkSessions(7);

  const handlePeriodChange = (newPeriod: ReportPeriod, start?: Date, end?: Date) => {
    setPeriod(newPeriod);
    setCustomStart(start);
    setCustomEnd(end);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Team Reports"
            description="Monitor team performance, track KPIs, and analyze productivity"
          />
          <ReportPeriodSelector 
            value={period} 
            onChange={handlePeriodChange}
            customStart={customStart}
            customEnd={customEnd}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 lg:w-auto lg:grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            {(isOwner || isManager) && (
              <TabsTrigger value="kpi">KPI Settings</TabsTrigger>
            )}
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <TeamReportsDashboard 
              summary={summary} 
              teamStats={teamStats} 
              isLoading={isLoading} 
            />
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <TeamPerformanceTable 
              teamStats={teamStats} 
              isLoading={isLoading} 
            />
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <TeamLeaderboard 
              teamStats={teamStats} 
              isLoading={isLoading} 
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ActivityHeatmap />
            <ProductivityMetricsCard />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Today's Sessions</h3>
              <WorkSessionList sessions={todaySessions} loading={sessionsLoading} />
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <AttendanceInsights />
          </TabsContent>

          {(isOwner || isManager) && (
            <TabsContent value="kpi" className="space-y-4">
              <KPITargetManager 
                targets={kpiTargets}
                teamStats={teamStats}
                onSave={(target) => setKPITarget.mutate(target)}
                onDelete={(id) => deleteKPITarget.mutate(id)}
                isLoading={isLoading}
              />
            </TabsContent>
          )}

          <TabsContent value="activity" className="space-y-4">
            <TeamActivityTimeline 
              activities={activityLogs} 
              isLoading={isLoading} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
