import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ReportsData } from '@/hooks/useReports';
import {
  ComposedChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface FinancialReportProps {
  data: ReportsData | null;
  loading: boolean;
  currency?: string;
  showComparison?: boolean;
}

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export function FinancialReport({ data, loading, currency = 'BDT', showComparison = false }: FinancialReportProps) {
  const summary = data?.summary;
  const profitLoss = data?.profitLoss;
  const cashFlow = data?.monthlyCashFlow || [];
  const expenseBreakdown = data?.expensesByCategory || [];
  const previousPeriod = data?.previousPeriod;

  const totalRevenue = summary?.totalRevenue || 0;
  const cogs = profitLoss?.cogs || 0;
  const grossProfit = profitLoss?.grossProfit || (totalRevenue - cogs);
  const operatingExpenses = profitLoss?.operatingExpenses || 0;
  const netProfit = profitLoss?.netProfit || 0;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Comparison calculations
  const prevNetProfit = previousPeriod ? (previousPeriod.revenue - (previousPeriod.grossProfit || 0) - (previousPeriod.expenses || 0)) : 0;
  const netProfitChange = prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : undefined;

  const totalInflow = cashFlow.reduce((sum, c) => sum + c.inflow, 0);
  const totalOutflow = cashFlow.reduce((sum, c) => sum + c.outflow, 0);
  const netCashFlow = totalInflow - totalOutflow;

  const totalExpenses = expenseBreakdown.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* P&L Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Profit & Loss Statement
          </CardTitle>
          <CardDescription>Financial performance summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Revenue Section */}
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-lg">Total Revenue</span>
              <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalRevenue, currency)}</span>
            </div>

            <Separator />

            {/* COGS */}
            <div className="flex items-center justify-between py-2 text-muted-foreground">
              <span>Cost of Goods Sold (COGS)</span>
              <span className="text-destructive">-{formatCurrency(cogs, currency)}</span>
            </div>

            {/* Gross Profit */}
            <div className="flex items-center justify-between py-2 bg-muted/50 rounded-lg px-3">
              <span className="font-medium">Gross Profit</span>
              <div className="text-right">
                <span className={`font-semibold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatCurrency(grossProfit, currency)}
                </span>
                <span className="text-sm text-muted-foreground ml-2">({grossMargin.toFixed(1)}% margin)</span>
              </div>
            </div>

            <Separator />

            {/* Operating Expenses */}
            <div className="flex items-center justify-between py-2 text-muted-foreground">
              <span>Operating Expenses</span>
              <span className="text-destructive">-{formatCurrency(operatingExpenses, currency)}</span>
            </div>

            {/* Net Profit */}
            <div className={`flex items-center justify-between py-3 rounded-lg px-3 ${netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
              <span className="font-bold text-lg">Net Profit</span>
              <div className="text-right">
                <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatCurrency(netProfit, currency)}
                </span>
                {showComparison && netProfitChange !== undefined && (
                  <div className={`flex items-center justify-end gap-1 text-sm ${netProfitChange >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {netProfitChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{netProfitChange >= 0 ? '+' : ''}{netProfitChange.toFixed(1)}%</span>
                  </div>
                )}
                <span className="text-sm text-muted-foreground ml-2">({netMargin.toFixed(1)}% margin)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow & Expense Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cash Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Cash Flow
            </CardTitle>
            <CardDescription>Money in vs money out</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
                <ArrowDownRight className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
                <div className="text-xs text-muted-foreground">Inflow</div>
                <div className="font-semibold text-emerald-600 text-sm">{formatCurrency(totalInflow, currency)}</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-center">
                <ArrowUpRight className="h-4 w-4 mx-auto text-destructive mb-1" />
                <div className="text-xs text-muted-foreground">Outflow</div>
                <div className="font-semibold text-destructive text-sm">{formatCurrency(totalOutflow, currency)}</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${netCashFlow >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                <Wallet className={`h-4 w-4 mx-auto mb-1 ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-destructive'}`} />
                <div className="text-xs text-muted-foreground">Net</div>
                <div className={`font-semibold text-sm ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatCurrency(netCashFlow, currency)}
                </div>
              </div>
            </div>

            {cashFlow.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} className="text-xs" />
                  <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                  <Legend />
                  <Bar dataKey="inflow" name="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" name="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="balance" name="Balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No cash flow data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Total: {formatCurrency(totalExpenses, currency)}</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length > 0 ? (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={30}
                    >
                      {expenseBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 max-h-[120px] overflow-y-auto">
                  {expenseBreakdown.map((item, index) => (
                    <div key={item.category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(item.amount, currency)}</span>
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(0) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No expense data
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
