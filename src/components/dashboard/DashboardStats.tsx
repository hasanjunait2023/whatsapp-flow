import { Card, CardContent } from '@/components/ui/card';
import { 
  ShoppingCart, DollarSign, Clock, MessageSquare, 
  Users, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  subtitle?: string;
  loading?: boolean;
}

function StatCard({ title, value, change, icon, subtitle, loading }: StatCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="h-3 w-3" />;
    return change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-muted-foreground';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-20" />
            <div className="h-8 bg-muted rounded w-16" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {(change !== undefined || subtitle) && (
              <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
                {change !== undefined && (
                  <>
                    {getTrendIcon()}
                    <span>{change > 0 ? '+' : ''}{change}%</span>
                  </>
                )}
                {subtitle && (
                  <span className="text-muted-foreground ml-1">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  ordersToday: number;
  ordersTodayChange: number;
  revenueToday: number;
  revenueTodayChange: number;
  pendingOrders: number;
  messagesToday: number;
  messagesTodayChange: number;
  conversationsToday: number;
  conversationsTodayChange: number;
  avgResponseTime: number;
  activeAgents: number;
  totalAgents: number;
  loading?: boolean;
  canViewRevenue?: boolean;
}

export function DashboardStats({
  ordersToday,
  ordersTodayChange,
  revenueToday,
  revenueTodayChange,
  pendingOrders,
  messagesToday,
  messagesTodayChange,
  conversationsToday,
  conversationsTodayChange,
  avgResponseTime,
  activeAgents,
  totalAgents,
  loading,
  canViewRevenue = true,
}: DashboardStatsProps) {
  return (
    <div data-tour="dashboard-stats" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <StatCard
        title="Orders Today"
        value={ordersToday}
        change={ordersTodayChange}
        icon={<ShoppingCart className="h-5 w-5" />}
        loading={loading}
      />
      
      {canViewRevenue ? (
        <StatCard
          title="Revenue Today"
          value={formatCurrency(revenueToday)}
          change={revenueTodayChange}
          icon={<DollarSign className="h-5 w-5" />}
          loading={loading}
        />
      ) : (
        <StatCard
          title="Your Orders"
          value={ordersToday}
          icon={<ShoppingCart className="h-5 w-5" />}
          loading={loading}
        />
      )}
      
      <StatCard
        title="Pending Orders"
        value={pendingOrders}
        icon={<Clock className="h-5 w-5" />}
        subtitle="need attention"
        loading={loading}
      />
      
      <StatCard
        title="Messages Today"
        value={messagesToday}
        change={messagesTodayChange}
        icon={<MessageSquare className="h-5 w-5" />}
        loading={loading}
      />

      <StatCard
        title="Conversations"
        value={conversationsToday}
        change={conversationsTodayChange}
        icon={<Users className="h-5 w-5" />}
        loading={loading}
      />
      
      <StatCard
        title="Avg Response"
        value={`${avgResponseTime}m`}
        icon={<Clock className="h-5 w-5" />}
        subtitle="response time"
        loading={loading}
      />
      
      <StatCard
        title="Active Agents"
        value={`${activeAgents}/${totalAgents}`}
        icon={<Users className="h-5 w-5" />}
        subtitle="online today"
        loading={loading}
      />
    </div>
  );
}
