import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ReportsData } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/currency';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, UserPlus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerReportProps {
  data: ReportsData | null;
  loading: boolean;
  currency?: string;
  showComparison?: boolean;
}

const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7c2d12',
};

export function CustomerReport({ data, loading, currency = 'BDT', showComparison = false }: CustomerReportProps) {
  const summary = data?.summary;
  const customerGrowth = data?.customerGrowth || [];
  const topCustomers = data?.topCustomers || [];
  const customerRisk = data?.customerRisk || [];
  const previousPeriod = data?.previousPeriod;

  const newCustomers = summary?.newCustomers || 0;
  const totalCustomers = customerGrowth.length > 0 ? customerGrowth[customerGrowth.length - 1]?.totalCustomers || 0 : 0;

  const customerChange = previousPeriod && previousPeriod.customers > 0
    ? ((newCustomers - previousPeriod.customers) / previousPeriod.customers) * 100
    : undefined;

  const totalAtRisk = customerRisk.reduce((sum, r) => sum + r.count, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">New Customers</span>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UserPlus className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{newCustomers}</span>
              {showComparison && customerChange !== undefined && (
                <div className={`flex items-center gap-1 mt-1 text-sm ${customerChange >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {customerChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{customerChange >= 0 ? '+' : ''}{customerChange.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Customers</span>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{totalCustomers}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Growth</CardTitle>
          <CardDescription>New customer acquisition over time</CardDescription>
        </CardHeader>
        <CardContent>
          {customerGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={customerGrowth}>
                <defs>
                  <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="newCustomers"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorCustomers)"
                  name="New Customers"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No growth data for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Customers & Risk Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
            <CardDescription>Customers by total spending</CardDescription>
          </CardHeader>
          <CardContent>
            {topCustomers.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.slice(0, 10).map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium truncate max-w-[120px]">{customer.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{customer.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{customer.totalOrders}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(customer.totalSpent, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No customer data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Customer Risk Analysis
            </CardTitle>
            <CardDescription>{totalAtRisk} customers analyzed</CardDescription>
          </CardHeader>
          <CardContent>
            {customerRisk.length > 0 ? (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={customerRisk}
                      dataKey="count"
                      nameKey="level"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      label={({ level }) => level}
                    >
                      {customerRisk.map((entry) => (
                        <Cell key={entry.level} fill={RISK_COLORS[entry.level as keyof typeof RISK_COLORS] || '#gray'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {customerRisk.map((item) => (
                    <div key={item.level} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: RISK_COLORS[item.level as keyof typeof RISK_COLORS] }} 
                        />
                        <span className="capitalize font-medium">{item.level} Risk</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{item.count}</span>
                        <span className="text-muted-foreground ml-1 text-sm">
                          ({totalAtRisk > 0 ? ((item.count / totalAtRisk) * 100).toFixed(0) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No risk data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
