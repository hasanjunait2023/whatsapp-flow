import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Line, ComposedChart } from 'recharts';
import { AccountsData } from '@/hooks/useAccounts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Download } from 'lucide-react';
import { exportCashFlowPDF } from '@/lib/pdf-export';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

interface CashFlowReportProps {
  data: AccountsData | null;
  loading: boolean;
  startDate: Date;
  endDate: Date;
}

export function CashFlowReport({ data, loading, startDate, endDate }: CashFlowReportProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
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

  // Calculate running balance for the chart
  let runningBalance = 0;
  const cashFlowWithBalance = data.cashFlow.map(cf => {
    runningBalance += cf.net;
    return { ...cf, balance: runningBalance };
  });

  const chartConfig = {
    inflow: { label: 'Cash Inflow', color: 'hsl(142, 76%, 36%)' },
    outflow: { label: 'Cash Outflow', color: 'hsl(0, 84%, 60%)' },
    balance: { label: 'Running Balance', color: 'hsl(221, 83%, 53%)' }
  };

  const handleExportPDF = () => {
    try {
      exportCashFlowPDF(data, startDate, endDate, 'BDT');
      toast.success('Cash Flow Report exported to PDF');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold">Cash Flow Report</h2>
          <p className="text-muted-foreground">
            Period: {format(startDate, 'MMMM d, yyyy')} - {format(endDate, 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Inflow</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalInflow)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {data.revenueByPaymentMethod.reduce((sum, m) => sum + m.count, 0)} verified payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Outflow</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalOutflow)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {data.expensesByCategory.length} expense categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <TrendingUp className={`h-4 w-4 ${netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(netCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netCashFlow >= 0 ? 'Positive cash position' : 'Negative cash position'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Cash Flow</CardTitle>
          <CardDescription>Inflows, outflows, and running balance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ComposedChart data={cashFlowWithBalance}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis 
                yAxisId="left"
                className="text-xs" 
                tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`} 
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                className="text-xs" 
                tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`} 
              />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="font-medium mb-2">{label}</div>
                        {payload.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-medium">
                              {formatCurrency(entry.value as number)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="inflow" fill="hsl(142, 76%, 36%)" name="Cash In" />
              <Bar yAxisId="left" dataKey="outflow" fill="hsl(0, 84%, 60%)" name="Cash Out" />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="balance" 
                stroke="hsl(221, 83%, 53%)" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Running Balance"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Detailed Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>Detailed view of cash movements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Month</th>
                  <th className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">Cash In</th>
                  <th className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">Cash Out</th>
                  <th className="px-4 py-3 text-right font-medium">Net</th>
                  <th className="px-4 py-3 text-right font-medium">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No cash flow data available
                    </td>
                  </tr>
                ) : (
                  cashFlowWithBalance.map((row, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{row.month}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                        {formatCurrency(row.inflow)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                        {formatCurrency(row.outflow)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${row.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {row.net >= 0 ? '+' : ''}{formatCurrency(row.net)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${row.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {cashFlowWithBalance.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/50 font-bold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                      {formatCurrency(totalInflow)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                      {formatCurrency(totalOutflow)}
                    </td>
                    <td className={`px-4 py-3 text-right ${netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
                    </td>
                    <td className="px-4 py-3 text-right">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Payments Notice */}
      {data.pendingPayments > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-semibold">Pending Cash Inflows</h4>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(data.pendingPayments)} in payments awaiting verification
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
