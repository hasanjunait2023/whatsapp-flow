import { useState } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { useCourier } from '@/hooks/useCourier';
import { Order } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/currency';

interface BulkBookParcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  onComplete: () => void;
}

export function BulkBookParcelDialog({ open, onOpenChange, orders, onComplete }: BulkBookParcelDialogProps) {
  const { steadfastIntegration, pathaoIntegration, bulkBookParcels } = useCourier();
  const [selectedCourier, setSelectedCourier] = useState<'steadfast' | 'pathao'>('steadfast');

  // Filter orders that can be booked (not already shipped/have tracking)
  const bookableOrders = orders.filter(order => 
    !order.tracking_number && 
    ['pending', 'confirmed', 'processing'].includes(order.status) &&
    order.customer_phone &&
    order.customer_name
  );

  const unbookableOrders = orders.filter(order => 
    order.tracking_number || 
    !['pending', 'confirmed', 'processing'].includes(order.status) ||
    !order.customer_phone ||
    !order.customer_name
  );

  const handleSubmit = async () => {
    if (bookableOrders.length === 0) return;

    const parcels = bookableOrders.map(order => ({
      order_id: order.id,
      courier: selectedCourier,
      recipient_name: order.customer_name!,
      recipient_phone: order.customer_phone!,
      recipient_address: typeof order.shipping_address === 'string' 
        ? order.shipping_address 
        : order.shipping_address?.address || order.shipping_address?.city || 'Address not provided',
      recipient_city: typeof order.shipping_address === 'object' ? order.shipping_address?.city : undefined,
      weight_kg: 0.5,
      cod_amount: order.payment_status === 'unpaid' ? order.total : 0,
      item_description: `Order ${order.order_number}`,
    }));

    await bulkBookParcels.mutateAsync(parcels);
    onComplete();
    onOpenChange(false);
  };

  const availableCouriers = [
    { id: 'steadfast', name: 'Steadfast', active: steadfastIntegration?.is_active },
    { id: 'pathao', name: 'Pathao', active: pathaoIntegration?.is_active },
  ].filter((c) => c.active);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Bulk Book Parcels
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Ready to Book</span>
              </div>
              <p className="text-2xl font-bold mt-1">{bookableOrders.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Skipped</span>
              </div>
              <p className="text-2xl font-bold mt-1">{unbookableOrders.length}</p>
            </div>
          </div>

          {/* Courier Selection */}
          <div className="space-y-2">
            <Label>Courier Service</Label>
            {availableCouriers.length === 0 ? (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  No courier integrations configured. Go to Settings → Integrations to set up.
                </p>
              </div>
            ) : (
              <Select
                value={selectedCourier}
                onValueChange={(value) => setSelectedCourier(value as 'steadfast' | 'pathao')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select courier" />
                </SelectTrigger>
                <SelectContent>
                  {availableCouriers.map((courier) => (
                    <SelectItem key={courier.id} value={courier.id}>
                      <div className="flex items-center gap-2">
                        {courier.name}
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Orders List */}
          {bookableOrders.length > 0 && (
            <div className="space-y-2">
              <Label>Orders to Book ({bookableOrders.length})</Label>
              <ScrollArea className="h-[200px] rounded-lg border">
                <div className="p-2 space-y-2">
                  {bookableOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(order.total)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Skipped Orders */}
          {unbookableOrders.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Skipped Orders ({unbookableOrders.length})</Label>
              <ScrollArea className="h-[100px] rounded-lg border border-dashed">
                <div className="p-2 space-y-1">
                  {unbookableOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-2 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs">{order.order_number}</span>
                      </div>
                      <span className="text-xs">
                        {order.tracking_number ? 'Already booked' : 
                         !order.customer_phone ? 'No phone' :
                         !order.customer_name ? 'No name' :
                         'Invalid status'}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* COD Note */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> COD amount will be set automatically based on payment status. 
              Unpaid orders will have full order amount as COD.
            </p>
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={bulkBookParcels.isPending || availableCouriers.length === 0 || bookableOrders.length === 0}
          >
            {bulkBookParcels.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Book {bookableOrders.length} Parcels
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
