import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, DollarSign, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyCompact } from '@/lib/currency';

interface BusinessGrowthCardProps {
  newCustomersThisWeek: number;
  newCustomersLastWeek: number;
  monthlyRevenue: number;
  monthlyRevenueChange: number;
  collectionRate: number;
  loading?: boolean;
}

export function BusinessGrowthCard({
  newCustomersThisWeek,
  newCustomersLastWeek,
  monthlyRevenue,
  monthlyRevenueChange,
  collectionRate,
  loading,
}: BusinessGrowthCardProps) {
  const customerChange = newCustomersLastWeek > 0
    ? Math.round(((newCustomersThisWeek - newCustomersLastWeek) / newCustomersLastWeek) * 100)
    : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Business Growth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Customers */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900/30">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-sm">New Customers</span>
          </div>
          <div className="text-right">
            <p className="font-medium">{newCustomersThisWeek} this week</p>
            <p className={cn(
              "text-xs flex items-center gap-1 justify-end",
              customerChange > 0 ? "text-green-600" : customerChange < 0 ? "text-red-600" : "text-muted-foreground"
            )}>
              {customerChange > 0 ? <TrendingUp className="h-3 w-3" /> : customerChange < 0 ? <TrendingDown className="h-3 w-3" /> : null}
              {customerChange > 0 ? '+' : ''}{customerChange}% vs last week
            </p>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-green-100 text-green-600 dark:bg-green-900/30">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-sm">Monthly Revenue</span>
          </div>
          <div className="text-right">
            <p className="font-medium">{formatCurrencyCompact(monthlyRevenue)}</p>
            <p className={cn(
              "text-xs flex items-center gap-1 justify-end",
              monthlyRevenueChange > 0 ? "text-green-600" : monthlyRevenueChange < 0 ? "text-red-600" : "text-muted-foreground"
            )}>
              {monthlyRevenueChange > 0 ? <TrendingUp className="h-3 w-3" /> : monthlyRevenueChange < 0 ? <TrendingDown className="h-3 w-3" /> : null}
              {monthlyRevenueChange > 0 ? '+' : ''}{monthlyRevenueChange}% vs last month
            </p>
          </div>
        </div>

        {/* Collection Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900/30">
              <Percent className="h-4 w-4" />
            </div>
            <span className="text-sm">Collection Rate</span>
          </div>
          <div className="text-right">
            <p className="font-medium">{collectionRate}%</p>
            <p className="text-xs text-muted-foreground">
              paid orders
            </p>
          </div>
        </div>

        {/* Progress Bar for Collection Rate */}
        <div className="mt-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                collectionRate >= 80 ? "bg-green-500" : 
                collectionRate >= 50 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
