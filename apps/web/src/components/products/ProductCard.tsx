import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Package } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/currency';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const isOutOfStock = product.track_inventory && product.stock_quantity <= 0;
  const isLowStock =
    product.track_inventory && !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.compare_at_price!) * 100)
    : 0;

  const stockPill = isOutOfStock
    ? { variant: "destructive-soft" as const, label: "Out of stock", dot: "bg-destructive" }
    : isLowStock
      ? { variant: "warning-soft" as const, label: `Low · ${product.stock_quantity}`, dot: "bg-warning" }
      : { variant: "success-soft" as const, label: `In stock · ${product.stock_quantity}`, dot: "bg-success" };

  return (
    <Card hover="lift" className="overflow-hidden">
      <div className="aspect-square relative bg-muted">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {hasDiscount && (
          <Badge variant="destructive-soft" className="absolute top-2 left-2 tabular-nums">
            -{discountPercent}%
          </Badge>
        )}

        {!product.is_active && (
          <Badge variant="neutral-soft" className="absolute top-2 right-2">
            Inactive
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{product.name}</h3>
            {product.category && (
              <p className="text-xs text-muted-foreground">{product.category.name}</p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(product)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          <span className="font-semibold tabular-nums">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through tabular-nums">
              {formatCurrency(product.compare_at_price!)}
            </span>
          )}
        </div>

        {product.track_inventory && (
          <div className="mt-2.5">
            <Badge variant={stockPill.variant} className="gap-1.5 tabular-nums">
              <span className={`h-1.5 w-1.5 rounded-full ${stockPill.dot}`} aria-hidden />
              {stockPill.label}
            </Badge>
          </div>
        )}
        
        {product.sku && (
          <p className="mt-1 text-xs text-muted-foreground">
            SKU: {product.sku}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
