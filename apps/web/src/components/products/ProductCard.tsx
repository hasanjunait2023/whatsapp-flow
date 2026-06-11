import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/currency';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const isLowStock = product.track_inventory && product.stock_quantity <= product.low_stock_threshold;
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount 
    ? Math.round((1 - product.price / product.compare_at_price!) * 100)
    : 0;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
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
          <Badge className="absolute top-2 left-2 bg-destructive">
            -{discountPercent}%
          </Badge>
        )}
        
        {!product.is_active && (
          <Badge variant="secondary" className="absolute top-2 right-2">
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
          <span className="font-semibold">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(product.compare_at_price!)}
            </span>
          )}
        </div>
        
        {product.track_inventory && (
          <div className="mt-2 flex items-center gap-1">
            {isLowStock ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs text-amber-500">
                  Low stock: {product.stock_quantity}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                In stock: {product.stock_quantity}
              </span>
            )}
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
