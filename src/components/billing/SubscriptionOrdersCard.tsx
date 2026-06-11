import { useTenantSubscriptionOrders, TenantSubscriptionOrder } from '@/hooks/useTenantSubscriptionOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export function SubscriptionOrdersCard() {
  const { orders, loading } = useTenantSubscriptionOrders();

  const getStatusBadge = (status: TenantSubscriptionOrder['status']) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-500 hover:bg-green-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Subscription Orders
          </CardTitle>
          <CardDescription>Orders created by admin for your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No subscription orders yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Subscription Orders
        </CardTitle>
        <CardDescription>Orders created by admin for your subscription</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    #{order.order_number}
                  </span>
                  {getStatusBadge(order.status)}
                </div>
                <p className="text-sm font-medium">
                  {order.plan_name || 'Unknown Plan'} • {order.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(order.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">
                  ৳{order.amount.toLocaleString()}
                </p>
                {order.payment_method && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {order.payment_method.replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
