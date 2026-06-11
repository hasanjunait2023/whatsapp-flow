import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, Plus } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { formatCurrency } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';

interface LowStockAlertsProps {
  onRestock?: (productId: string, productName: string, currentStock: number) => void;
}

export function LowStockAlerts({ onRestock }: LowStockAlertsProps) {
  const { lowStockProducts, isLoadingLowStock } = useInventory();

  if (isLoadingLowStock) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lowStockProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mb-2 text-green-500" />
            <p className="font-medium text-foreground">All stocked up!</p>
            <p className="text-sm">No products are running low</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Low Stock Alerts
          <Badge variant="destructive" className="ml-auto">
            {lowStockProducts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lowStockProducts.slice(0, 5).map((product) => {
          const isOutOfStock = product.stock_quantity === 0;
          
          return (
            <div
              key={product.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isOutOfStock
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
              }`}
            >
              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className={isOutOfStock ? 'text-red-600' : 'text-amber-600'}>
                    {isOutOfStock ? 'Out of stock' : `${product.stock_quantity} left`}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(product.price)}
                  </span>
                </div>
              </div>
              
              {onRestock && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestock(product.id, product.name, product.stock_quantity)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Restock
                </Button>
              )}
            </div>
          );
        })}
        
        {lowStockProducts.length > 5 && (
          <p className="text-sm text-center text-muted-foreground py-2">
            +{lowStockProducts.length - 5} more items need restocking
          </p>
        )}
      </CardContent>
    </Card>
  );
}
