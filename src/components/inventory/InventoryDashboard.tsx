import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { useInventory, StockSummary } from '@/hooks/useInventory';
import { formatCurrency } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

function KPICard({ title, value, icon, description, variant = 'default' }: KPICardProps) {
  const variantStyles = {
    default: 'bg-card',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
    success: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function InventoryDashboard() {
  const { stockSummary, isLoadingSummary } = useInventory();

  if (isLoadingSummary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const summary: StockSummary = stockSummary || {
    totalProducts: 0,
    totalStockValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    movementsToday: 0,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Stock Value"
        value={formatCurrency(summary.totalStockValue)}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        description={`${summary.totalProducts} products tracked`}
        variant="success"
      />
      <KPICard
        title="Low Stock Items"
        value={summary.lowStockCount}
        icon={<TrendingDown className="h-4 w-4 text-amber-500" />}
        description="Below threshold"
        variant={summary.lowStockCount > 0 ? 'warning' : 'default'}
      />
      <KPICard
        title="Out of Stock"
        value={summary.outOfStockCount}
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        description="Needs restocking"
        variant={summary.outOfStockCount > 0 ? 'danger' : 'default'}
      />
      <KPICard
        title="Movements Today"
        value={summary.movementsToday}
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        description="Stock changes"
      />
    </div>
  );
}
