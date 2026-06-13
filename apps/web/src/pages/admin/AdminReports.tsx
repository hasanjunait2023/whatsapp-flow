import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { BarChart3, Ticket, ListTodo, AlertCircle, Clock } from 'lucide-react';
import { useAdminReports } from '@/hooks/useAdminReports';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { ResolvedHighlightTile } from '@/components/admin/reports/ResolvedHighlightTile';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import { format } from 'date-fns';

const breakdownConfig = {
  total: { label: 'Total', color: 'hsl(var(--chart-2))' },
  done: { label: 'Resolved / Done', color: 'hsl(var(--chart-1))' },
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

export default function AdminReports() {
  const { stats, activityLogs, loading } = useAdminReports();

  const taskRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  const ticketRate = stats.totalTickets > 0 ? Math.round((stats.resolvedTickets / stats.totalTickets) * 100) : 0;

  const breakdownData = [
    { name: 'Tasks', total: stats.totalTasks, done: stats.completedTasks },
    { name: 'Tickets', total: stats.totalTickets, done: stats.resolvedTickets },
  ];

  return (
    <AdminLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Admin activity reports &amp; performance metrics across the platform
          </p>
        </header>

        {/* KPI strip — 3 stat cards + the ONE orange resolved-tickets tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <KpiCard
            title="Total tickets"
            value={stats.totalTickets}
            icon={Ticket}
            tone="info"
            loading={loading}
          />
          <KpiCard
            title="Open tickets"
            value={stats.openTickets}
            icon={AlertCircle}
            tone="warning"
            loading={loading}
          />
          <KpiCard
            title="Pending tasks"
            value={stats.pendingTasks}
            icon={Clock}
            tone="primary"
            loading={loading}
          />
          <m.div variants={staggerItem}>
            <ResolvedHighlightTile
              resolved={stats.resolvedTickets}
              total={stats.totalTickets}
              loading={loading}
            />
          </m.div>
        </m.div>

        {/* Bento body */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
          {/* Breakdown chart */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Resolution Breakdown
              </CardTitle>
              <CardDescription>Total vs resolved across tasks and tickets</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[280px] w-full rounded-card" />
              ) : (
                <ChartContainer config={breakdownConfig} className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdownData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="total" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="done" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Rate summaries */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <ListTodo className="h-5 w-5 text-primary" />
                Completion &amp; Resolution
              </CardTitle>
              <CardDescription>How much of the queue is cleared</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="space-y-6">
                  <Skeleton className="h-16 w-full rounded-card" />
                  <Skeleton className="h-16 w-full rounded-card" />
                </div>
              ) : (
                <>
                  {/* Tasks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Task completion</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{taskRate}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${taskRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {stats.completedTasks} of {stats.totalTasks} tasks done · {stats.pendingTasks} pending
                    </p>
                  </div>

                  {/* Tickets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Ticket resolution</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{ticketRate}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-success transition-all"
                        style={{ width: `${ticketRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {stats.resolvedTickets} of {stats.totalTickets} tickets resolved · {stats.openTickets} open
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Recent Admin Activity
            </CardTitle>
            <CardDescription>Latest actions performed by admins</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activityLogs.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No activity yet"
                description="Admin actions across the platform will appear here as they happen."
                className="py-12"
              />
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted-soft">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-muted-soft text-xs font-semibold text-muted-foreground">
                                {getInitials(log.admin_name || 'Unknown')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{log.admin_name || 'Unknown'}</p>
                              <p className="truncate text-xs text-muted-foreground">{log.admin_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="neutral-soft">{log.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{log.entity_type}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </m.div>
    </AdminLayout>
  );
}
