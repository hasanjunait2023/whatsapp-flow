import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { useInventory, MOVEMENT_TYPES, StockMovement } from '@/hooks/useInventory';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface StockMovementsListProps {
  limit?: number;
  showHeader?: boolean;
}

export function StockMovementsList({ limit, showHeader = true }: StockMovementsListProps) {
  const { stockMovements, isLoadingMovements } = useInventory();

  const displayMovements = limit ? stockMovements.slice(0, limit) : stockMovements;

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
      case 'return':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'out':
      case 'damaged':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getMovementBadge = (type: string) => {
    const movement = MOVEMENT_TYPES.find(m => m.value === type);
    return (
      <Badge variant="outline" className="gap-1">
        {getMovementIcon(type)}
        {movement?.label || type}
      </Badge>
    );
  };

  if (isLoadingMovements) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-lg">Recent Stock Movements</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayMovements.length === 0) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-lg">Recent Stock Movements</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mb-2" />
            <p>No stock movements yet</p>
            <p className="text-sm">Stock changes will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg">Recent Stock Movements</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty Change</TableHead>
              <TableHead className="text-right">New Stock</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayMovements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {movement.product?.images?.[0] ? (
                        <img
                          src={movement.product.images[0]}
                          alt={movement.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{movement.product?.name || 'Unknown'}</p>
                      {movement.product?.sku && (
                        <p className="text-xs text-muted-foreground">{movement.product.sku}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getMovementBadge(movement.movement_type)}</TableCell>
                <TableCell className="text-right">
                  <span className={movement.quantity >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {movement.quantity >= 0 ? '+' : ''}{movement.quantity}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {movement.new_quantity}
                </TableCell>
                <TableCell>
                  <span className="capitalize text-sm text-muted-foreground">
                    {movement.reason?.replace('_', ' ') || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(movement.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
