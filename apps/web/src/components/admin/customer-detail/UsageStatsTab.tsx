import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MessageSquare, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';
import type { CustomerUsageStat } from '@/hooks/useCustomerDetails';

interface UsageStatsTabProps {
  usageStats: CustomerUsageStat[];
  totalMessages: number;
}

export function UsageStatsTab({ usageStats, totalMessages }: UsageStatsTabProps) {
  // Prepare chart data (reverse to show chronologically)
  const chartData = [...usageStats].reverse().map(stat => ({
    month: format(new Date(stat.period_start), 'MMM'),
    sent: stat.messages_sent,
    received: stat.messages_received,
  }));

  // Current month stats
  const currentMonth = usageStats[0];
  const previousMonth = usageStats[1];

  const currentTotal = currentMonth ? currentMonth.messages_sent + currentMonth.messages_received : 0;
  const previousTotal = previousMonth ? previousMonth.messages_sent + previousMonth.messages_received : 0;
  const percentChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  if (usageStats.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg">No Usage Data</h3>
        <p className="text-muted-foreground">Usage statistics will appear here once the customer starts using the platform.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Month Summary */}
      {currentMonth && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Current Month: {format(new Date(currentMonth.period_start), 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{currentMonth.messages_sent.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  Sent
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{currentMonth.messages_received.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <ArrowDownRight className="h-3 w-3" />
                  Received
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{currentTotal.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total</p>
                {percentChange !== 0 && (
                  <p className={`text-xs ${percentChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}% vs last month
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Message Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="sent" fill="hsl(var(--success))" name="Sent" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="received" fill="hsl(var(--primary))" name="Received" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Breakdown Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageStats.map((stat) => (
                <TableRow key={stat.period_start}>
                  <TableCell>{format(new Date(stat.period_start), 'MMMM yyyy')}</TableCell>
                  <TableCell className="text-right text-green-600">{stat.messages_sent.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-blue-600">{stat.messages_received.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">
                    {(stat.messages_sent + stat.messages_received).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
