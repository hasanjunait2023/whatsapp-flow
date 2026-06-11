import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ReportsData } from '@/hooks/useReports';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, CheckCircle2, Truck, Package } from 'lucide-react';

interface OperationsReportProps {
  data: ReportsData | null;
  loading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function OperationsReport({ data, loading }: OperationsReportProps) {
  const complaints = data?.complaintAnalysis || [];
  const deliveries = data?.deliveryPerformance || [];
  const openComplaints = data?.summary.openComplaints || 0;

  const totalComplaints = complaints.reduce((sum, c) => sum + c.count, 0);
  const avgResolutionTime = complaints.length > 0 
    ? complaints.reduce((sum, c) => sum + c.avgResolutionHours * c.count, 0) / totalComplaints 
    : 0;

  const totalShipped = deliveries.reduce((sum, d) => sum + d.shipped, 0);
  const totalDelivered = deliveries.reduce((sum, d) => sum + d.delivered, 0);
  const overallDeliveryRate = totalShipped > 0 ? (totalDelivered / totalShipped) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Complaints</span>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{totalComplaints}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Open Complaints</span>
              <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-destructive">{openComplaints}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Shipped</span>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{totalShipped}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Delivery Rate</span>
              <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-emerald-600">{overallDeliveryRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Complaints & Delivery Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Complaints by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Complaints by Category
            </CardTitle>
            <CardDescription>
              Avg resolution time: {avgResolutionTime.toFixed(1)} hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {complaints.length > 0 ? (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={complaints}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={40}
                      label={({ category }) => category}
                    >
                      {complaints.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {complaints.map((item, index) => (
                    <div key={item.category} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-medium capitalize">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{item.count}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          ({item.avgResolutionHours.toFixed(1)}h avg)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No complaint data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Summary
            </CardTitle>
            <CardDescription>
              {totalDelivered} of {totalShipped} orders delivered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Overall Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Delivery Rate</span>
                <span className="text-sm font-semibold">{overallDeliveryRate.toFixed(1)}%</span>
              </div>
              <Progress value={overallDeliveryRate} className="h-3" />
            </div>

            {deliveries.length > 0 ? (
              <div className="space-y-3">
                {deliveries.map((delivery) => (
                  <div key={delivery.courier} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{delivery.courier}</span>
                      <span className="text-sm text-muted-foreground">
                        {delivery.delivered}/{delivery.shipped} delivered
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={delivery.onTimeRate} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-12 text-right">
                        {delivery.onTimeRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No delivery data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Courier Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Courier Performance Details</CardTitle>
          <CardDescription>Detailed delivery metrics by courier</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Courier</TableHead>
                  <TableHead className="text-right">Shipped</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="w-[200px]">Delivery Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.courier}>
                    <TableCell className="font-medium capitalize">{delivery.courier}</TableCell>
                    <TableCell className="text-right">{delivery.shipped}</TableCell>
                    <TableCell className="text-right text-emerald-600">{delivery.delivered}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{delivery.shipped - delivery.delivered}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={delivery.onTimeRate} className="h-2" />
                        <span className="text-sm text-muted-foreground w-12">
                          {delivery.onTimeRate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No courier data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
