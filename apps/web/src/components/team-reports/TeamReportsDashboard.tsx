import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamMemberStats, TeamReportsSummary } from '@/hooks/useTeamReports';
import { 
  MessageSquare, 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  Users, 
  TrendingUp,
  Trophy 
} from 'lucide-react';

interface TeamReportsDashboardProps {
  summary: TeamReportsSummary;
  teamStats: TeamMemberStats[];
  isLoading: boolean;
}

export function TeamReportsDashboard({ summary, teamStats, isLoading }: TeamReportsDashboardProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTeamMembers}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMessagesSent}</div>
            <p className="text-xs text-muted-foreground">
              {(summary.totalMessagesSent / Math.max(summary.totalTeamMembers, 1)).toFixed(1)} per member
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Created</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrdersCreated}</div>
            <p className="text-xs text-muted-foreground">
              {(summary.totalOrdersCreated / Math.max(summary.totalTeamMembers, 1)).toFixed(1)} per member
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳{summary.totalSalesAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ৳{(summary.totalSalesAmount / Math.max(summary.totalOrdersCreated, 1)).toFixed(0)} avg order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performer Card */}
      {summary.topPerformer && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={summary.topPerformer.avatarUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {summary.topPerformer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{summary.topPerformer.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{summary.topPerformer.role}</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {summary.topPerformer.kpiScore.toFixed(0)}% KPI
                </Badge>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-2 rounded-lg bg-background">
                <div className="text-xl font-bold">{summary.topPerformer.messagesSent}</div>
                <div className="text-xs text-muted-foreground">Messages</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-background">
                <div className="text-xl font-bold">{summary.topPerformer.ordersCreated}</div>
                <div className="text-xs text-muted-foreground">Orders</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-background">
                <div className="text-xl font-bold">৳{summary.topPerformer.totalSalesAmount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Sales</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-background">
                <div className="text-xl font-bold">{summary.topPerformer.conversionRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Conversion</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.avgTeamResponseTime.toFixed(1)} min
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Average team response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Team Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const totalCustomers = teamStats.reduce((sum, m) => sum + m.customersAssigned, 0);
              const conversionRate = totalCustomers > 0 
                ? (summary.totalOrdersCreated / totalCustomers) * 100 
                : 0;
              return (
                <>
                  <div className="text-3xl font-bold">{conversionRate.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {summary.totalOrdersCreated} orders from {totalCustomers} customers
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
