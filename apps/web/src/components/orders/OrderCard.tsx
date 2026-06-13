import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Truck, CreditCard, Trash2, Package } from 'lucide-react';
import { Order } from '@/hooks/useOrders';
import { OrderStatusPill, PaymentStatusPill } from '@/components/orders/order-status';
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

interface OrderCardProps {
  order: Order;
  onView: (order: Order) => void;
  onUpdateStatus: (order: Order) => void;
  onUpdatePayment: (order: Order) => void;
  onDelete: (order: Order) => void;
}

export function OrderCard({ order, onView, onUpdateStatus, onUpdatePayment, onDelete }: OrderCardProps) {
  return (
    <Card className="hover:shadow-elevation-2 transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold">{order.order_number}</span>
              <OrderStatusPill status={order.status} />
              <PaymentStatusPill status={order.payment_status} />
            </div>

            <p className="text-sm text-muted-foreground">
              {order.customer_name || order.contact?.name || 'Unknown Customer'}
              {order.customer_phone && ` • ${order.customer_phone}`}
            </p>

            <div className="flex items-center gap-4 mt-2">
              <span className="text-lg font-bold tabular-nums">
                {formatCurrency(order.total)}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </span>
            </div>

            {order.tracking_number && (
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                <span>{order.courier && `${order.courier}: `}{order.tracking_number}</span>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(order)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(order)}>
                <Package className="h-4 w-4 mr-2" />
                Update Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdatePayment(order)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Update Payment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(order)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
