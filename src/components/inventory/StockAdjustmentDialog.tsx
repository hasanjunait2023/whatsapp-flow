import { useState, useEffect } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory, ADJUSTMENT_REASONS } from '@/hooks/useInventory';
import { useProducts } from '@/hooks/useProducts';
import { Package, Plus, Minus, RefreshCw } from 'lucide-react';

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedProductId?: string;
  preselectedProductName?: string;
  preselectedCurrentStock?: number;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  preselectedProductId,
  preselectedProductName,
  preselectedCurrentStock,
}: StockAdjustmentDialogProps) {
  const { adjustStock } = useInventory();
  const { products } = useProducts();
  
  const [productId, setProductId] = useState(preselectedProductId || '');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('purchase');
  const [notes, setNotes] = useState('');

  // Get current stock for selected product
  const selectedProduct = products.find(p => p.id === productId);
  const currentStock = preselectedCurrentStock ?? selectedProduct?.stock_quantity ?? 0;

  // Calculate new stock preview
  const getNewStock = () => {
    const qty = parseInt(quantity) || 0;
    switch (adjustmentType) {
      case 'add':
        return currentStock + qty;
      case 'remove':
        return Math.max(0, currentStock - qty);
      case 'set':
        return qty;
      default:
        return currentStock;
    }
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setProductId(preselectedProductId || '');
      setAdjustmentType('add');
      setQuantity('');
      setReason('purchase');
      setNotes('');
    }
  }, [open, preselectedProductId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId || !quantity) return;

    await adjustStock.mutateAsync({
      productId,
      adjustmentType,
      quantity: parseInt(quantity),
      reason,
      notes: notes || undefined,
    });

    onOpenChange(false);
  };

  const trackingProducts = products.filter(p => p.track_inventory);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[425px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Adjust Stock</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Selection */}
          {preselectedProductId ? (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="h-10 w-10 rounded bg-background flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{preselectedProductName}</p>
                <p className="text-sm text-muted-foreground">Current stock: {currentStock}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {trackingProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <span>{product.name}</span>
                        <span className="text-muted-foreground text-xs">
                          (Stock: {product.stock_quantity})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={adjustmentType === 'add' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('add')}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
              <Button
                type="button"
                variant={adjustmentType === 'remove' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('remove')}
                className="gap-1"
              >
                <Minus className="h-4 w-4" />
                Remove
              </Button>
              <Button
                type="button"
                variant={adjustmentType === 'set' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('set')}
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Set
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={adjustmentType === 'set' ? 'New stock level' : 'Quantity to adjust'}
            />
            {quantity && productId && (
              <p className="text-sm text-muted-foreground">
                New stock will be: <span className="font-medium text-foreground">{getNewStock()}</span>
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this adjustment..."
              rows={2}
            />
          </div>

          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!productId || !quantity || adjustStock.isPending}
            >
              {adjustStock.isPending ? 'Adjusting...' : 'Adjust Stock'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
