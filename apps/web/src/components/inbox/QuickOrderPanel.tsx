import { useState } from 'react';
import { Contact } from '@/hooks/useContacts';
import { useOrders, OrderFormData } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  ShoppingBag,
  Loader2,
  Package,
  Search,
  MapPin,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';

interface QuickOrderPanelProps {
  contact: Contact;
  onOrderCreated?: (orderId: string) => void;
}

interface OrderLineItem {
  id: string;
  product_id?: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
}

export default function QuickOrderPanel({ contact, onOrderCreated }: QuickOrderPanelProps) {
  const { createOrder } = useOrders();
  const { products, isLoading: loadingProducts } = useProducts();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState(contact.name || '');
  const [customerPhone, setCustomerPhone] = useState(contact.phone_number);
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderLineItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [shippingAmount, setShippingAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addProduct = (product: typeof products[0]) => {
    const existingIndex = items.findIndex(i => i.product_id === product.id);
    
    if (existingIndex >= 0) {
      // Increment quantity
      setItems(prev => prev.map((item, i) => 
        i === existingIndex 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item
      setItems(prev => [...prev, {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku || undefined,
        quantity: 1,
        unit_price: product.price,
        discount_amount: 0,
      }]);
    }
    setSearchQuery('');
  };

  const updateItem = (id: string, updates: Partial<OrderLineItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => 
    sum + (item.quantity * item.unit_price) - item.discount_amount, 0
  );

  const total = subtotal - discountAmount + shippingAmount;

  const handleCreateOrder = async () => {
    if (items.length === 0) {
      toast({
        title: 'No items added',
        description: 'Please add at least one item to the order.',
        variant: 'destructive',
      });
      return;
    }

    const orderData: OrderFormData = {
      contact_id: contact.id,
      customer_name: customerName || undefined,
      customer_phone: customerPhone,
      customer_email: customerEmail || undefined,
      shipping_address: shippingAddress || undefined,
      notes: notes || undefined,
      source: 'whatsapp',
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount,
      })),
      discount_amount: discountAmount,
      shipping_amount: shippingAmount,
    };

    try {
      const order = await createOrder.mutateAsync(orderData);
      // Reset form
      setItems([]);
      setNotes('');
      setCustomerEmail('');
      setShippingAddress('');
      setShippingAmount(0);
      setDiscountAmount(0);
      onOrderCreated?.(order.id);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Customer Info (Pre-filled) */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              Customer Info
            </h4>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email (optional)</Label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Shipping Address */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </h4>
            <Textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Full delivery address (Street, Area, City, Postal Code)"
              rows={3}
              className="resize-none"
            />
            <p className="text-[10px] text-muted-foreground">
              Required for courier booking
            </p>
          </div>

          <Separator />

          {/* Add Products */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Items
            </h4>
            
            {/* Product Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="h-9 pl-9"
              />
              
              {/* Product dropdown */}
              {searchQuery && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                  {loadingProducts ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      Loading...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      No products found
                    </div>
                  ) : (
                    filteredProducts.slice(0, 5).map(product => (
                      <button
                        key={product.id}
                        onClick={() => addProduct(product)}
                        className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-primary">
                          {formatCurrency(product.price)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Order Items */}
            {items.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-border rounded-lg">
                <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No items added</p>
                <p className="text-xs text-muted-foreground">Search and add products above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="p-2.5 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        {item.product_sku && (
                          <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                          className="h-8 text-center"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">×</span>
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                          className="h-8"
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground w-16 text-right">
                        ৳{(item.quantity * item.unit_price - item.discount_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Order Notes */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Order Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this order..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Totals */}
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground">Discount</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="h-7 w-24 text-right"
              />
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground">Shipping</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={shippingAmount}
                onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                className="h-7 w-24 text-right"
              />
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="text-primary">৳{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Create Order Button */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={handleCreateOrder}
          disabled={items.length === 0 || createOrder.isPending}
          className="w-full"
        >
          {createOrder.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4 mr-2" />
              Create Order
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
