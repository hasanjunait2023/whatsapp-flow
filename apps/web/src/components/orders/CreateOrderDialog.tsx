import { useState, useEffect } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { OrderFormData, useOrders } from '@/hooks/useOrders';
import { useProducts, Product } from '@/hooks/useProducts';
import { useContacts } from '@/hooks/useContacts';
import { formatCurrency } from '@/lib/currency';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrderItemForm {
  product_id?: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
}

export function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
  const { createOrder } = useOrders();
  const { products } = useProducts();
  const { contacts } = useContacts();
  
  const [formData, setFormData] = useState({
    contact_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    notes: '',
    discount_amount: 0,
    shipping_amount: 0,
    tax_amount: 0,
  });
  
  const [items, setItems] = useState<OrderItemForm[]>([
    { product_name: '', quantity: 1, unit_price: 0, discount_amount: 0 }
  ]);

  const isLoading = createOrder.isPending;

  useEffect(() => {
    if (open) {
      setFormData({
        contact_id: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        notes: '',
        discount_amount: 0,
        shipping_amount: 0,
        tax_amount: 0,
      });
      setItems([{ product_name: '', quantity: 1, unit_price: 0, discount_amount: 0 }]);
    }
  }, [open]);

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      newItems[index] = {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku || undefined,
        quantity: 1,
        unit_price: product.price,
        discount_amount: 0,
      };
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof OrderItemForm, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_name: '', quantity: 1, unit_price: 0, discount_amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price) - item.discount_amount;
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - formData.discount_amount + formData.shipping_amount + formData.tax_amount;
  };

  const handleContactSelect = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setFormData(prev => ({
        ...prev,
        contact_id: contactId,
        customer_name: contact.name || '',
        customer_phone: contact.phone_number,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => item.product_name && item.quantity > 0);
    if (validItems.length === 0) {
      return;
    }

    try {
      await createOrder.mutateAsync({
        contact_id: formData.contact_id || undefined,
        customer_name: formData.customer_name || undefined,
        customer_phone: formData.customer_phone || undefined,
        customer_email: formData.customer_email || undefined,
        notes: formData.notes || undefined,
        discount_amount: formData.discount_amount,
        shipping_amount: formData.shipping_amount,
        tax_amount: formData.tax_amount,
        items: validItems,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-3xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create New Order</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <div className="space-y-4">
            <h3 className="font-medium">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Select Contact (Optional)</Label>
                <Select
                  value={formData.contact_id || 'none'}
                  onValueChange={(value) => value !== 'none' && handleContactSelect(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Manual entry</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name || contact.phone_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Phone Number</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="customer_email">Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Order Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-end p-3 border rounded-lg bg-muted/50">
                  <div className="flex-1 space-y-2">
                    <Label>Product</Label>
                    <Select
                      value={item.product_id || 'custom'}
                      onValueChange={(value) => value !== 'custom' && handleProductSelect(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select or enter custom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom item</SelectItem>
                        {products.filter(p => p.is_active).map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!item.product_id && (
                      <Input
                        placeholder="Product name"
                        value={item.product_name}
                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                      />
                    )}
                  </div>
                  
                  <div className="w-20 space-y-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="w-24 space-y-2">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="w-20 space-y-2">
                    <Label>Discount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.discount_amount}
                      onChange={(e) => updateItem(index, 'discount_amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="mb-0.5"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Order Discount</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                value={formData.discount_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping">Shipping</Label>
              <Input
                id="shipping"
                type="number"
                step="0.01"
                min="0"
                value={formData.shipping_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">Tax</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                min="0"
                value={formData.tax_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-end">
              <div className="w-full p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{formatCurrency(calculateTotal())}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Order notes..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || items.every(i => !i.product_name)}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
