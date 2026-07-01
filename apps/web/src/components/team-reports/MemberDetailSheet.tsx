import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TeamMemberStats } from '@/hooks/useTeamReports';
import { 
  MessageSquare, 
  ShoppingCart, 
  Users, 
  Clock, 
  Package, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface MemberDetailSheetProps {
  member: TeamMemberStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailSheet({ member, open, onOpenChange }: MemberDetailSheetProps) {
  if (!member) return null;

  const stats = [
    { 
      icon: MessageSquare, 
      label: 'Messages Sent', 
      value: member.messagesSent,
      color: 'text-blue-500' 
    },
    { 
      icon: Clock, 
      label: 'Avg Response Time', 
      value: `${member.avgResponseTimeMinutes.toFixed(1)} min`,
      color: 'text-green-500' 
    },
    { 
      icon: Users, 
      label: 'Customers Assigned', 
      value: member.customersAssigned,
      color: 'text-purple-500' 
    },
    { 
      icon: ShoppingCart, 
      label: 'Orders Created', 
      value: member.ordersCreated,
      color: 'text-violet-500' 
    },
    { 
      icon: TrendingUp, 
      label: 'Total Sales', 
      value: `৳${member.totalSalesAmount.toLocaleString()}`,
      color: 'text-emerald-500' 
    },
    { 
      icon: Package, 
      label: 'Parcels Booked', 
      value: member.parcelsBooked,
      color: 'text-cyan-500' 
    },
    { 
      icon: AlertCircle, 
      label: 'Complaints Resolved', 
      value: member.complaintsResolved,
      color: 'text-red-500' 
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Team Member Details</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback className="text-lg">
                {member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{member.name}</h2>
              <p className="text-sm text-muted-foreground">{member.email}</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {member.role}
              </Badge>
            </div>
          </div>

          {/* KPI Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">KPI Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">{member.kpiScore.toFixed(0)}%</div>
                <div className="flex-1">
                  <Progress value={member.kpiScore} className="h-2" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Based on messages, orders, conversion rate, and response time
              </p>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{member.conversionRate.toFixed(1)}%</div>
                <span className="text-sm text-muted-foreground">
                  ({member.ordersCreated} orders / {member.customersAssigned} customers)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="mt-1 text-lg font-semibold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Additional Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Conversations</span>
                <span className="font-medium">{member.activeConversations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg Order Value</span>
                <span className="font-medium">৳{member.avgOrderValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Parcels per Order</span>
                <span className="font-medium">
                  {member.ordersCreated > 0 
                    ? (member.parcelsBooked / member.ordersCreated * 100).toFixed(0) 
                    : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
