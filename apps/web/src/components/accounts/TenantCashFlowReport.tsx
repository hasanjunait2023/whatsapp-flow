import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { TenantAccountsData } from '@/hooks/useTenantAccounts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

interface TenantCashFlowReportProps {
  data: TenantAccountsData | null;
  loading: boolean;
  startDate: Date;
  endDate: Date;
  currency?: string;
}

export function TenantCashFlowReport({
  data,
  loading,
  startDate,
  endDate,
  currency = 'BDT',
}: TenantCashFlowReportProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const totalInflow = data.cashFlow.reduce((sum, cf) => sum + cf.inflow, 0);
  const totalOutflow = data.cashFlow.reduce((sum, cf) => sum + cf.outflow, 0);
  const netCashFlow = totalInflow - totalOutflow;

  // Calculate running balance
  let runningBalance = 0;
  const chartData = data.cashFlow.map((cf) => {
    runningBalance += cf.net;
    return {
      ...cf,
      balance: runningBalance,
    };
  });

  const chartConfig = {
    inflow: { label: 'Cash In', color: 'hsl(142 76% 36%)' },
    outflow: { label: 'Cash Out', color: 'hsl(var(--destructive))' },
    balance: { label: 'Balance', color: 'hsl(var(--primary))' },
  };

  const handleExport = () => {
    const content = `
CASH FLOW REPORT
Period: ${format(startDate, 'MMMM d, yyyy')} - ${format(endDate, 'MMMM d, yyyy')}

SUMMARY
Total Cash Inflow: ${formatCurrency(totalInflow, currency)}
Total Cash Outflow: ${formatCurrency(totalOutflow, currency)}
Net Cash Flow: ${formatCurrency(netCashFlow, currency)}

MONTHLY BREAKDOWN
${data.cashFlow.map(cf => `${cf.month}: In ${formatCurrency(cf.inflow, currency)} | Out ${formatCurrency(cf.outflow, currency)} | Net ${formatCurrency(cf.net, currency)}`).join('\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Cash Flow Report exported');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Cash Flow Report</CardTitle>
            <CardDescription>
              Period: {format(startDate, 'MMMM d, yyyy')} - {format(endDate, 'MMMM d, yyyy')}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Inflow</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalInflow, currency)}</div>
            <p className="text-xs text-muted-foreground">From paid orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Outflow</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOutflow, currency)}</div>
            <p className="text-xs text-muted-foreground">From expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(netCashFlow, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netCashFlow >= 0 ? 'Positive cash flow' : 'Negative cash flow'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Cash Flow</CardTitle>
          <CardDescription>Inflows, outflows, and running balance</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-80">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="inflow" name="Cash In" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" name="Cash Out" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="balance"
                name="Running Balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Cash In</TableHead>
                  <TableHead className="text-right">Cash Out</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(row.inflow, currency)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(row.outflow, currency)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${row.net >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(row.net, currency)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${row.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(row.balance, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Cash Notice */}
      {data.unpaidOrdersAmount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Wallet className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Pending Cash Inflows</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You have {data.unpaidOrdersCount} unpaid orders worth {formatCurrency(data.unpaidOrdersAmount, currency)} that are not included in cash inflows.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
