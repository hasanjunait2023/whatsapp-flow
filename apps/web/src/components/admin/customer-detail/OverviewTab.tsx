import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { 
  MessageSquare, 
  ShoppingCart, 
  Users, 
  CreditCard, 
  Smartphone,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import type { CustomerFullDetails } from '@/hooks/useCustomerDetails';

interface OverviewTabProps {
  details: CustomerFullDetails;
}

export function OverviewTab({ details }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Plan"
          value={details.plan_name || 'No Plan'}
          icon={CreditCard}
          iconColor="text-primary"
        />
        <StatCard
          title="Status"
          value={details.is_activated ? 'Active' : 'Inactive'}
          icon={details.is_activated ? CheckCircle2 : XCircle}
          iconColor={details.is_activated ? 'text-success' : 'text-destructive'}
        />
        <StatCard
          title="Instances"
          value={details.instance_count}
          icon={Smartphone}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Team"
          value={`${details.team_member_count} members`}
          icon={Users}
          iconColor="text-purple-500"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Messages"
          value={details.message_count.toLocaleString()}
          description="total"
          icon={MessageSquare}
          iconColor="text-green-500"
        />
        <StatCard
          title="Orders"
          value={details.order_count}
          description="total"
          icon={ShoppingCart}
          iconColor="text-violet-500"
        />
        <StatCard
          title="Contacts"
          value={details.contact_count.toLocaleString()}
          description="total"
          icon={Users}
          iconColor="text-cyan-500"
        />
        <StatCard
          title="Total Paid"
          value={`৳${details.total_paid.toLocaleString()}`}
          description="lifetime"
          icon={CreditCard}
          iconColor="text-emerald-500"
        />
      </div>

      {/* Subscription Info */}
      {details.subscription && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscription Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{details.subscription.plan_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={details.subscription.status === 'active' ? 'default' : 'secondary'}>
                {details.subscription.status}
              </Badge>
            </div>
            {details.subscription.current_period_start && details.subscription.current_period_end && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Period</span>
                <span className="text-sm">
                  {format(new Date(details.subscription.current_period_start), 'MMM d')} - {format(new Date(details.subscription.current_period_end), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Workspace Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Workspace Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{details.tenant_name}</span>
          </div>
          {details.tenant_slug && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Slug</span>
              <code className="text-sm bg-muted px-2 py-0.5 rounded">{details.tenant_slug}</code>
            </div>
          )}
          {details.activated_at && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Activated</span>
              <span className="text-sm">{format(new Date(details.activated_at), 'MMMM d, yyyy')}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="text-sm">{format(new Date(details.created_at), 'MMMM d, yyyy')}</span>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Instances */}
      {details.instances.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              WhatsApp Instances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {details.instances.map((instance) => (
                <div 
                  key={instance.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">
                        {instance.phone_number || 'No phone'}
                        {instance.is_default && (
                          <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{instance.name}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={instance.status === 'connected' ? 'default' : 'secondary'}
                    className={instance.status === 'connected' ? 'bg-success' : ''}
                  >
                    {instance.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
