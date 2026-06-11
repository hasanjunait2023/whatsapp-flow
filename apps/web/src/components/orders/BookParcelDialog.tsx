import { useState, useEffect } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, CheckCircle2 } from 'lucide-react';
import { useCourier, BookParcelData } from '@/hooks/useCourier';
import { Order } from '@/hooks/useOrders';

interface BookParcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function BookParcelDialog({ open, onOpenChange, order }: BookParcelDialogProps) {
  const { steadfastIntegration, pathaoIntegration, bookParcel } = useCourier();
  
  const [formData, setFormData] = useState<Partial<BookParcelData>>({
    courier: 'steadfast',
    recipient_name: '',
    recipient_phone: '',
    recipient_address: '',
    recipient_city: '',
    weight_kg: 0.5,
    cod_amount: 0,
    item_description: '',
    special_instructions: '',
  });

  useEffect(() => {
    if (order) {
     // Convert address object to string if needed
     let addressString = '';
     if (typeof order.shipping_address === 'object' && order.shipping_address !== null) {
       const addr = order.shipping_address as any;
       addressString = [addr.street, addr.city, addr.country, addr.postal_code]
         .filter(Boolean)
         .join(', ');
     } else {
       addressString = order.shipping_address || '';
     }

      setFormData((prev) => ({
        ...prev,
        recipient_name: order.customer_name || '',
        recipient_phone: order.customer_phone || '',
       recipient_address: addressString,
        cod_amount: order.payment_status === 'pending' ? order.total : 0,
        item_description: `Order ${order.order_number}`,
      }));
    }
  }, [order]);

  const handleSubmit = async () => {
    if (!order) return;
    
    await bookParcel.mutateAsync({
      order_id: order.id,
      courier: formData.courier as 'steadfast' | 'pathao',
      recipient_name: formData.recipient_name!,
      recipient_phone: formData.recipient_phone!,
      recipient_address: formData.recipient_address!,
      recipient_city: formData.recipient_city,
      weight_kg: formData.weight_kg,
      cod_amount: formData.cod_amount,
      item_description: formData.item_description,
      special_instructions: formData.special_instructions,
    });
    
    onOpenChange(false);
  };

  const availableCouriers = [
    { id: 'steadfast', name: 'Steadfast', active: steadfastIntegration?.is_active },
    { id: 'pathao', name: 'Pathao', active: pathaoIntegration?.is_active },
  ].filter((c) => c.active);

  if (!order) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Book Parcel - {order.order_number}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
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
                value={formData.courier}
                onValueChange={(value) => setFormData({ ...formData, courier: value as any })}
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

          {/* Recipient Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Recipient Name *</Label>
              <Input
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={formData.recipient_phone}
                onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                placeholder="+880 1XXXXXXXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Delivery Address *</Label>
            <Textarea
              value={formData.recipient_address}
              onChange={(e) => setFormData({ ...formData, recipient_address: e.target.value })}
              placeholder="Full delivery address"
              rows={2}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={formData.recipient_city}
                onChange={(e) => setFormData({ ...formData, recipient_city: e.target.value })}
                placeholder="Dhaka"
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>COD Amount</Label>
              <Input
                type="number"
                value={formData.cod_amount}
                onChange={(e) => setFormData({ ...formData, cod_amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Cash on delivery amount to collect
              </p>
            </div>
            <div className="space-y-2">
              <Label>Item Description</Label>
              <Input
                value={formData.item_description}
                onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
                placeholder="Package contents"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Special Instructions</Label>
            <Textarea
              value={formData.special_instructions}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              placeholder="Any special delivery instructions"
              rows={2}
            />
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={bookParcel.isPending || availableCouriers.length === 0 || !formData.recipient_name || !formData.recipient_phone || !formData.recipient_address}
          >
            {bookParcel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Book Parcel
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
