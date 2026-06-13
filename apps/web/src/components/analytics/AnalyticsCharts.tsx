import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageVolumeData,
  ResponseTimeData,
  TeamPerformanceData,
} from '@/hooks/useAnalytics';

/**
 * Tokens-only analytics charts (Finexy "Warm Light Fintech").
 * Orange = --chart-1, ink = --chart-2. Token tooltip mirrors OrdersRevenueChart.
 * Presentation only — consumes the existing useAnalytics shapes unchanged.
 */

function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

interface LegendDotProps {
  color: string;
  label: string;
}

function LegendDot({ color, label }: LegendDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}

interface TooltipRow {
  label: string;
  value: string;
  color: string;
}

function TokenTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-control border bg-popover p-3 text-popover-foreground shadow-elevation-3">
      <p className="text-xs font-semibold">{title}</p>
      <div className="mt-1.5 space-y-1 text-xs">
        {rows.map((row) => (
          <p key={row.label} className="flex items-center justify-between gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
              {row.label}
            </span>
            <span className="tabular-nums font-medium text-foreground">{row.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

const CHART_1 = 'hsl(var(--chart-1))';
const CHART_2 = 'hsl(var(--chart-2))';

/* ---------------- Message volume (orange + ink area) ---------------- */

interface MessageVolumeCardProps {
  data: MessageVolumeData[];
  className?: string;
}

export function MessageVolumeCard({ data, className }: MessageVolumeCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">Message volume</CardTitle>
          <p className="text-sm text-muted-foreground">Sent and received over time</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <LegendDot color={CHART_1} label="Sent" />
          <LegendDot color={CHART_2} label="Received" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="volSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_1} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={CHART_1} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="volReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_2} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={CHART_2} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--border))' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <TokenTooltip
                      title={String(label)}
                      rows={[
                        { label: 'Sent', value: String(payload[0]?.payload?.sent ?? 0), color: CHART_1 },
                        { label: 'Received', value: String(payload[0]?.payload?.received ?? 0), color: CHART_2 },
                      ]}
                    />
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="sent"
                stroke={CHART_1}
                strokeWidth={2}
                fill="url(#volSent)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="received"
                stroke={CHART_2}
                strokeWidth={2}
                fill="url(#volReceived)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Response time (orange line) ---------------- */

interface ResponseTimeCardProps {
  data: ResponseTimeData[];
  className?: string;
}

export function ResponseTimeCard({ data, className }: ResponseTimeCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base">Response times</CardTitle>
        <p className="text-sm text-muted-foreground">Average time to respond to messages</p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={formatResponseTime}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--border))' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <TokenTooltip
                      title={String(label)}
                      rows={[
                        {
                          label: 'Avg response',
                          value: formatResponseTime(Number(payload[0]?.payload?.avgMinutes ?? 0)),
                          color: CHART_1,
                        },
                      ]}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="avgMinutes"
                stroke={CHART_1}
                strokeWidth={2}
                dot={{ fill: CHART_1, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, stroke: CHART_1, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Team performance (grouped bars + roster table) ---------------- */

interface TeamPerformanceCardProps {
  data: TeamPerformanceData[];
  className?: string;
}

export function TeamPerformanceCard({ data, className }: TeamPerformanceCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">Team performance</CardTitle>
          <p className="text-sm text-muted-foreground">Messages and conversations by member</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <LegendDot color={CHART_1} label="Messages" />
          <LegendDot color={CHART_2} label="Conversations" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-foreground">No team performance data yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign conversations to team members to see their performance.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted-soft))' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <TokenTooltip
                          title={String(label)}
                          rows={[
                            { label: 'Messages', value: String(payload[0]?.payload?.messagesSent ?? 0), color: CHART_1 },
                            {
                              label: 'Conversations',
                              value: String(payload[0]?.payload?.conversationsHandled ?? 0),
                              color: CHART_2,
                            },
                          ]}
                        />
                      );
                    }}
                  />
                  <Bar dataKey="messagesSent" fill={CHART_1} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="conversationsHandled" fill={CHART_2} radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Team member</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((member) => (
                  <TableRow key={member.name}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-accent text-primary text-xs font-semibold">
                            {member.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{member.messagesSent}</TableCell>
                    <TableCell className="text-right tabular-nums">{member.conversationsHandled}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
