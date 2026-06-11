import { useState, useEffect } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, Truck, Clock, FileText, Send, Printer } from 'lucide-react';
import { Order, ORDER_STATUSES, PAYMENT_STATUSES, useOrders } from '@/hooks/useOrders';
import { useInvoices } from '@/hooks/useInvoices';
import { useCourier } from '@/hooks/useCourier';
import { BookParcelDialog } from './BookParcelDialog';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function OrderDetailsDialog({ open, onOpenChange, order: initialOrder }: OrderDetailsDialogProps) {
  const { getOrderWithItems, updateOrderStatus, updatePaymentStatus, updateTracking } = useOrders();
  const { generateInvoice, invoices } = useInvoices();
  const { getShipmentsByOrder } = useCourier();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');
  const [bookParcelOpen, setBookParcelOpen] = useState(false);

  useEffect(() => {
    if (open && initialOrder) {
      setLoading(true);
      getOrderWithItems(initialOrder.id)
        .then(data => {
          setOrder(data);
          setTrackingNumber(data?.tracking_number || '');
          setCourier(data?.courier || '');
        })
        .finally(() => setLoading(false));
    }
  }, [open, initialOrder?.id]);

  const orderInvoices = invoices.filter(inv => inv.order_id === order?.id);
  const orderShipments = order ? getShipmentsByOrder(order.id) : [];

  if (!order) {
    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <p>Order not found</p>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  const statusConfig = ORDER_STATUSES.find(s => s.value === order.status) || ORDER_STATUSES[0];
  const paymentConfig = PAYMENT_STATUSES.find(s => s.value === order.payment_status) || PAYMENT_STATUSES[0];

  const handleStatusChange = async (status: string) => {
    await updateOrderStatus.mutateAsync({ orderId: order.id, status });
    setOrder(prev => prev ? { ...prev, status } : null);
  };

  const handlePaymentChange = async (paymentStatus: string) => {
    await updatePaymentStatus.mutateAsync({ orderId: order.id, paymentStatus });
    setOrder(prev => prev ? { ...prev, payment_status: paymentStatus } : null);
  };

  const handleTrackingUpdate = async () => {
    await updateTracking.mutateAsync({ orderId: order.id, trackingNumber, courier });
    setOrder(prev => prev ? { ...prev, tracking_number: trackingNumber, courier } : null);
  };

  const handleGenerateInvoice = async () => {
    await generateInvoice.mutateAsync(order.id);
  };

  const handlePrintInvoice = () => {
    const invoice = orderInvoices[0];
    if (invoice?.pdf_url) {
      // Open in new window and trigger print
      const printWindow = window.open(invoice.pdf_url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="max-w-2xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-3">
              {order.order_number}
              <Badge className={`${statusConfig.color} text-white`}>{statusConfig.label}</Badge>
              <Badge className={`${paymentConfig.color} text-white`}>{paymentConfig.label}</Badge>
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setBookParcelOpen(true)}>
                <Truck className="h-4 w-4 mr-2" />
                Book Parcel
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateInvoice}
                disabled={generateInvoice.isPending}
              >
                {generateInvoice.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Generate Invoice
              </Button>
              {orderInvoices.length > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    asChild
                  >
                    <a href={orderInvoices[0].pdf_url || '#'} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      View Invoice
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePrintInvoice}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Invoice
                  </Button>
                </>
              )}
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Customer
              </h3>
              <div className="text-sm space-y-1">
                <p>{order.customer_name || 'Not provided'}</p>
                {order.customer_phone && <p className="text-muted-foreground">{order.customer_phone}</p>}
                {order.customer_email && <p className="text-muted-foreground">{order.customer_email}</p>}
                {order.shipping_address && (
                  <p className="text-muted-foreground">
                    {typeof order.shipping_address === 'string' 
                      ? order.shipping_address 
                      : [
                          (order.shipping_address as any).street,
                          (order.shipping_address as any).city,
                          (order.shipping_address as any).postal_code,
                          (order.shipping_address as any).country,
                        ].filter(Boolean).join(', ')
                    }
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Order Items */}
            <div>
              <h3 className="font-medium mb-2">Items</h3>
              <div className="space-y-2">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      {(item as any).variant_name && (
                        <p className="text-xs text-muted-foreground">Variant: {(item as any).variant_name}</p>
                      )}
                      {item.product_sku && <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>}
                    </div>
                    <div className="text-right">
                      <p>{item.quantity} × {formatCurrency(item.unit_price)}</p>
                      {item.discount_amount > 0 && (
                        <p className="text-xs text-destructive">-{formatCurrency(item.discount_amount)}</p>
                      )}
                      <p className="font-medium">{formatCurrency(item.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 space-y-1 text-right">
                <p className="text-sm">Subtotal: {formatCurrency(order.subtotal)}</p>
                {order.discount_amount > 0 && (
                  <p className="text-sm text-destructive">Discount: -{formatCurrency(order.discount_amount)}</p>
                )}
                {order.shipping_amount > 0 && (
                  <p className="text-sm">Shipping: {formatCurrency(order.shipping_amount)}</p>
                )}
                {order.tax_amount > 0 && (
                  <p className="text-sm">Tax: {formatCurrency(order.tax_amount)}</p>
                )}
                <p className="text-lg font-bold">Total: {formatCurrency(order.total)}</p>
              </div>
            </div>

            <Separator />

            {/* Shipments */}
            {orderShipments.length > 0 && (
              <>
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Shipments
                  </h3>
                  <div className="space-y-2">
                    {orderShipments.map((shipment) => (
                      <div key={shipment.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium capitalize">{shipment.courier}</p>
                            <p className="text-sm text-muted-foreground">
                              {shipment.consignment_id || 'Pending'}
                            </p>
                          </div>
                          <Badge variant={shipment.status === 'delivered' ? 'default' : 'secondary'}>
                            {shipment.status}
                          </Badge>
                        </div>
                        {shipment.cod_amount && shipment.cod_amount > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            COD: ৳{shipment.cod_amount}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Status Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order Status</Label>
                <Select value={order.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={order.payment_status} onValueChange={handlePaymentChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tracking */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Manual Tracking
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Courier (e.g., Steadfast)"
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="w-32"
                />
                <Input
                  placeholder="Tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleTrackingUpdate}
                  disabled={updateTracking.isPending}
                >
                  {updateTracking.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div>
                <h3 className="font-medium mb-1">Notes</h3>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Created: {format(new Date(order.created_at), 'PPp')}
              {order.shipped_at && ` • Shipped: ${format(new Date(order.shipped_at), 'PPp')}`}
              {order.delivered_at && ` • Delivered: ${format(new Date(order.delivered_at), 'PPp')}`}
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <BookParcelDialog
        open={bookParcelOpen}
        onOpenChange={setBookParcelOpen}
        order={order}
      />
    </>
  );
}
