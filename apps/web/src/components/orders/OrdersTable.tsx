import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { MoreVertical, Eye, Truck, CreditCard, Trash2, Package, Phone, MessageCircle, AlertTriangle, CheckCircle, HelpCircle, ShoppingBag, ShoppingCart, Globe, PhoneCall, Facebook, Instagram, MoreHorizontal, Pencil, Printer } from 'lucide-react';
import { Order, OrderSource, ORDER_STATUSES, PAYMENT_STATUSES } from '@/hooks/useOrders';
import { BookParcelDialog } from '@/components/orders/BookParcelDialog';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

interface PurchaseBehaviorData {
  risk_level: string | null;
  total_deliveries: number | null;
  successful_deliveries: number | null;
  cancelled_deliveries: number | null;
  returned_deliveries: number | null;
  checked_at: string | null;
}

interface OrdersTableProps {
  orders: Order[];
  purchaseBehavior: Record<string, PurchaseBehaviorData>;
  selection: {
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    isAllSelected: boolean;
    toggleAll: () => void;
    selectedCount: number;
  };
  onView: (order: Order) => void;
  onEdit?: (order: Order) => void;
  onPrint?: (order: Order) => void;
  onUpdateStatus: (order: Order) => void;
  onUpdatePayment: (order: Order) => void;
  onDelete: (order: Order) => void;
}

export function OrdersTable({
  orders,
  purchaseBehavior,
  selection,
  onView,
  onEdit,
  onPrint,
  onUpdateStatus,
  onUpdatePayment,
  onDelete,
}: OrdersTableProps) {
  const [bookingOrder, setBookingOrder] = useState<Order | null>(null);

  const getStatusBadge = (status: string) => {
    const config = ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
    return (
      <Badge variant="outline" className={`${config.color} text-white border-0 text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    const config = PAYMENT_STATUSES.find(s => s.value === status) || PAYMENT_STATUSES[0];
    return (
      <Badge variant="outline" className={`${config.color} text-white border-0 text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const getRiskBadge = (phoneNumber: string | null) => {
    if (!phoneNumber) {
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          <HelpCircle className="h-3 w-3 mr-1" />
          N/A
        </Badge>
      );
    }

    const behavior = purchaseBehavior[phoneNumber];
    if (!behavior || !behavior.risk_level) {
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          <HelpCircle className="h-3 w-3 mr-1" />
          Not Checked
        </Badge>
      );
    }

    const level = behavior.risk_level.toLowerCase();
    const hasStats = behavior.total_deliveries !== null && behavior.total_deliveries > 0;
    const successRate = hasStats && behavior.total_deliveries 
      ? Math.round(((behavior.successful_deliveries || 0) / behavior.total_deliveries) * 100)
      : 0;

    const badgeContent = () => {
      if (level === 'low') {
        return (
          <Badge className="bg-success text-success-foreground text-xs cursor-help">
            <CheckCircle className="h-3 w-3 mr-1" />
            Low Risk
          </Badge>
        );
      } else if (level === 'medium') {
        return (
          <Badge className="bg-warning text-warning-foreground text-xs cursor-help">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Medium
          </Badge>
        );
      } else if (level === 'high') {
        return (
          <Badge className="bg-destructive text-destructive-foreground text-xs cursor-help">
            <AlertTriangle className="h-3 w-3 mr-1" />
            High Risk
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="text-xs cursor-help">
          {behavior.risk_level}
        </Badge>
      );
    };

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {badgeContent()}
        </HoverCardTrigger>
        <HoverCardContent className="w-56 p-0" align="center">
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm">Delivery History</p>
              <p className={`text-xs font-semibold ${
                hasStats 
                  ? successRate >= 80 
                    ? 'text-success' 
                    : successRate >= 50 
                      ? 'text-warning' 
                      : 'text-destructive'
                  : 'text-muted-foreground'
              }`}>
                {hasStats ? `${successRate}%` : 'New'}
              </p>
            </div>
            {hasStats ? (
              <div className="space-y-1">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      successRate >= 80 
                        ? 'bg-success' 
                        : successRate >= 50 
                          ? 'bg-warning' 
                          : 'bg-destructive'
                    }`}
                    style={{ width: `${successRate}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Success Rate
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No delivery history</p>
            )}
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Deliveries</span>
              <span className="font-medium">{behavior.total_deliveries || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-success">✓ Successful</span>
              <span className="font-medium text-success">{behavior.successful_deliveries || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-warning">✗ Cancelled</span>
              <span className="font-medium text-warning">{behavior.cancelled_deliveries || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-destructive">↩ Returned</span>
              <span className="font-medium text-destructive">{behavior.returned_deliveries || 0}</span>
            </div>
          </div>
          {behavior.checked_at && (
            <div className="px-3 py-2 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Checked: {format(new Date(behavior.checked_at), 'dd MMM yyyy, HH:mm')}
              </p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    );
  };

  const formatAddress = (address: any) => {
    if (!address) return null;
    if (typeof address === 'string') return address;
    const parts = [address.city, address.area, address.district].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const formatPhoneForWA = (phone: string) => {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    // Add 880 prefix for Bangladesh if not present
    if (cleaned.startsWith('0')) {
      cleaned = '880' + cleaned.substring(1);
    } else if (!cleaned.startsWith('880')) {
      cleaned = '880' + cleaned;
    }
    return cleaned;
  };

  const canBookCourier = (order: Order) => {
    return ['pending', 'confirmed', 'processing'].includes(order.status) && !order.tracking_number;
  };

  const sourceConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    manual: { 
      label: 'Manual', 
      icon: <ShoppingCart className="h-4 w-4" />, 
      className: 'text-muted-foreground' 
    },
    woocommerce: { 
      label: 'WooCommerce', 
      icon: <Globe className="h-4 w-4" />, 
      className: 'text-purple-600 dark:text-purple-400' 
    },
    whatsapp: { 
      label: 'WhatsApp', 
      icon: <MessageCircle className="h-4 w-4" />, 
      className: 'text-success' 
    },
    call: { 
      label: 'Call', 
      icon: <PhoneCall className="h-4 w-4" />, 
      className: 'text-blue-600 dark:text-blue-400' 
    },
    facebook: { 
      label: 'Facebook', 
      icon: <Facebook className="h-4 w-4" />, 
      className: 'text-blue-700 dark:text-blue-400' 
    },
    instagram: { 
      label: 'Instagram', 
      icon: <Instagram className="h-4 w-4" />, 
      className: 'text-pink-600 dark:text-pink-400' 
    },
    other: { 
      label: 'Other', 
      icon: <MoreHorizontal className="h-4 w-4" />, 
      className: 'text-muted-foreground' 
    },
  };

  const getSourceIcon = (source: OrderSource | null) => {
    const config = sourceConfig[source || 'manual'] || sourceConfig.manual;
    return <span className={config.className}>{config.icon}</span>;
  };

  const getSourceLabel = (source: OrderSource | null) => {
    const config = sourceConfig[source || 'manual'] || sourceConfig.manual;
    return config.label;
  };

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selection.isAllSelected}
                  onCheckedChange={selection.toggleAll}
                />
              </TableHead>
              <TableHead className="w-[120px]">Order</TableHead>
              <TableHead className="min-w-[180px]">Customer</TableHead>
              <TableHead className="w-[70px] text-center">Source</TableHead>
              <TableHead className="w-[70px] text-center">Items</TableHead>
              <TableHead className="w-[90px] text-right">Total</TableHead>
              <TableHead className="w-[95px] text-center">Status</TableHead>
              <TableHead className="w-[85px] text-center">Payment</TableHead>
              <TableHead className="w-[100px] text-center">Risk</TableHead>
              <TableHead className="w-[100px] text-center">Courier</TableHead>
              <TableHead className="w-[90px] text-center">Contact</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const address = formatAddress(order.shipping_address);
              const phone = order.customer_phone || order.contact?.phone_number;
              
              return (
                <TableRow 
                  key={order.id} 
                  className="group"
                  data-state={selection.isSelected(order.id) ? 'selected' : undefined}
                >
                  {/* Checkbox */}
                  <TableCell>
                    <Checkbox
                      checked={selection.isSelected(order.id)}
                      onCheckedChange={() => selection.toggle(order.id)}
                    />
                  </TableCell>

                  {/* Order ID */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{order.order_number}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'dd MMM, HH:mm')}
                      </span>
                    </div>
                  </TableCell>

                  {/* Customer */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm truncate max-w-[180px]">
                        {order.customer_name || order.contact?.name || 'Unknown'}
                      </span>
                      {phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {phone}
                        </span>
                      )}
                      {address && (
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          📍 {address}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Source */}
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex">
                          {getSourceIcon(order.source)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{getSourceLabel(order.source)}</TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Items */}
                  <TableCell className="text-center">
                    {order.items && order.items.length > 0 ? (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                            <ShoppingBag className="h-3 w-3" />
                            <span>{order.items.length}</span>
                          </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72 p-0" align="start">
                          <div className="p-3 border-b bg-muted/30">
                            <p className="font-medium text-sm">Order Items</p>
                            <p className="text-xs text-muted-foreground">{order.order_number}</p>
                          </div>
                          <div className="p-2 max-h-[200px] overflow-auto">
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={item.id || idx} className="flex items-start justify-between gap-2 p-2 rounded bg-muted/50">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                                    </p>
                                  </div>
                                  <span className="text-sm font-semibold whitespace-nowrap">
                                    {formatCurrency(item.total)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="p-3 border-t bg-muted/30 flex justify-between">
                            <span className="text-sm font-medium">Total</span>
                            <span className="text-sm font-bold">{formatCurrency(order.total)}</span>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Total */}
                  <TableCell className="text-right">
                    <span className="font-semibold text-sm">
                      {formatCurrency(order.total)}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    {getStatusBadge(order.status)}
                  </TableCell>

                  {/* Payment */}
                  <TableCell className="text-center">
                    {getPaymentBadge(order.payment_status)}
                  </TableCell>

                  {/* Risk */}
                  <TableCell className="text-center">
                    {getRiskBadge(phone || null)}
                  </TableCell>

                  {/* Courier */}
                  <TableCell className="text-center">
                    {order.tracking_number ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center">
                            <Badge variant="outline" className="text-xs bg-primary/10">
                              <Truck className="h-3 w-3 mr-1" />
                              Booked
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{order.courier}: {order.tracking_number}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : canBookCourier(order) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setBookingOrder(order)}
                      >
                        <Truck className="h-3 w-3 mr-1" />
                        Book
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {phone ? (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                asChild
                              >
                                <a href={`tel:${phone}`}>
                                  <Phone className="h-4 w-4 text-primary" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Call Customer</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                asChild
                              >
                                <a 
                                  href={`https://wa.me/${formatPhoneForWA(phone)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="h-4 w-4 text-success" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>WhatsApp</TooltipContent>
                          </Tooltip>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No phone</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center justify-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onView(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onEdit?.(order)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onPrint?.(order)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Print</TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Book Parcel Dialog */}
      <BookParcelDialog
        open={!!bookingOrder}
        onOpenChange={(open) => !open && setBookingOrder(null)}
        order={bookingOrder}
      />
    </TooltipProvider>
  );
}
