import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  AlertTriangle, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  RefreshCw,
  Clock,
  TrendingUp,
  Truck,
  User
} from 'lucide-react';
import { usePurchaseBehavior, PurchaseBehavior, getRiskLevelColor } from '@/hooks/usePurchaseBehavior';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PurchaseBehaviorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  contactId?: string;
  contactName?: string;
  tenantId?: string;
}

export function PurchaseBehaviorSheet({
  open,
  onOpenChange,
  phoneNumber,
  contactId,
  contactName,
  tenantId,
}: PurchaseBehaviorSheetProps) {
  const { cachedBehavior, isLoadingCached, checkBehavior } = usePurchaseBehavior(contactId, phoneNumber, tenantId);
  const [behaviorData, setBehaviorData] = useState<PurchaseBehavior | null>(null);

  // Reset behavior data when contact changes
  useEffect(() => {
    setBehaviorData(null);
  }, [contactId, phoneNumber]);

  const handleCheck = async (forceRefresh = false) => {
    const result = await checkBehavior.mutateAsync({
      phone: phoneNumber,
      contactId,
      forceRefresh,
    });
    setBehaviorData(result);
  };

  // Use the most recent data available
  const data = behaviorData || (cachedBehavior ? formatCachedData(cachedBehavior) : null);
  const isLoading = checkBehavior.isPending || isLoadingCached;

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low':
        return <ShieldCheck className="h-6 w-6 text-green-600" />;
      case 'medium':
        return <Shield className="h-6 w-6 text-yellow-600" />;
      case 'high':
        return <ShieldAlert className="h-6 w-6 text-red-600" />;
      default:
        return <Shield className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getRiskRecommendation = (level: string, successRate: number) => {
    if (level === 'low' && successRate >= 90) {
      return { text: 'Safe for COD', color: 'text-green-600', icon: CheckCircle2 };
    } else if (level === 'medium' || (successRate >= 70 && successRate < 90)) {
      return { text: 'Proceed with caution', color: 'text-yellow-600', icon: AlertTriangle };
    } else {
      return { text: 'Consider advance payment', color: 'text-red-600', icon: XCircle };
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Purchase Behavior
          </SheetTitle>
          <SheetDescription>
            Delivery history and risk assessment for {contactName || phoneNumber}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Phone Number Display */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="font-medium">{phoneNumber}</p>
            </div>
          </div>

          {/* Check Button */}
          {!data && !isLoading && (
            <Button onClick={() => handleCheck()} className="w-full" size="lg">
              <TrendingUp className="h-4 w-4 mr-2" />
              Check Purchase Behavior
            </Button>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Checking purchase behavior...</p>
            </div>
          )}

          {/* Results */}
          {data && !isLoading && (
            <>
              {/* Risk Level Header */}
              <Card className={cn('border-2', getRiskLevelColor(data.riskLevel))}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getRiskIcon(data.riskLevel)}
                      <div>
                        <p className="text-sm text-muted-foreground">Risk Level</p>
                        <p className="text-2xl font-bold capitalize">{data.riskLevel}</p>
                      </div>
                    </div>
                    {data.isNewCustomer && (
                      <Badge variant="outline">New Customer</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Package className="h-4 w-4" />
                      <span className="text-xs">Total</span>
                    </div>
                    <p className="text-2xl font-bold">{data.totalDeliveries}</p>
                    <p className="text-xs text-muted-foreground">Deliveries</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Successful</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{data.successfulDeliveries}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.totalDeliveries > 0 
                        ? `${((data.successfulDeliveries / data.totalDeliveries) * 100).toFixed(0)}%`
                        : '0%'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs">Cancelled</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{data.cancelledDeliveries}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.totalDeliveries > 0 
                        ? `${((data.cancelledDeliveries / data.totalDeliveries) * 100).toFixed(0)}%`
                        : '0%'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-yellow-600 mb-1">
                      <RotateCcw className="h-4 w-4" />
                      <span className="text-xs">Returned</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{data.returnedDeliveries}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.totalDeliveries > 0 
                        ? `${((data.returnedDeliveries / data.totalDeliveries) * 100).toFixed(0)}%`
                        : '0%'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Success Rate */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Delivery Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Success Rate</span>
                      <span className="font-medium">{data.successRate.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={data.successRate} 
                      className="h-3"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Courier Breakdown */}
              {data.courierBreakdown && Object.keys(data.courierBreakdown).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Courier Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(data.courierBreakdown).map(([courier, stats]) => {
                      const courierSuccessRate = stats.total > 0 
                        ? (stats.success / stats.total) * 100 
                        : 0;
                      return (
                        <div key={courier} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium capitalize">{courier}</span>
                            <span className="text-sm text-muted-foreground">
                              {stats.total} deliveries
                            </span>
                          </div>
                          <Progress value={courierSuccessRate} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{courierSuccessRate.toFixed(0)}% success</span>
                            <span>
                              ✓{stats.success} ✗{stats.cancel} ↺{stats.return}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Recommendation */}
              {(() => {
                const rec = getRiskRecommendation(data.riskLevel, data.successRate);
                const RecIcon = rec.icon;
                return (
                  <Card className="border-dashed">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <RecIcon className={cn('h-5 w-5', rec.color)} />
                        <div>
                          <p className="text-sm text-muted-foreground">Recommendation</p>
                          <p className={cn('font-medium', rec.color)}>{rec.text}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <Separator />

              {/* Last Checked & Refresh */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {data.checkedAt ? (
                    <span>Checked {formatDistanceToNow(new Date(data.checkedAt), { addSuffix: true })}</span>
                  ) : (
                    <span>Just checked</span>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCheck(true)}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatCachedData(cached: any): PurchaseBehavior {
  const successRate = cached.total_deliveries > 0 
    ? (cached.successful_deliveries / cached.total_deliveries) * 100 
    : 0;

  return {
    phoneNumber: cached.phone_number,
    riskLevel: cached.risk_level || 'medium',
    customerRating: cached.customer_rating,
    totalDeliveries: cached.total_deliveries || 0,
    successfulDeliveries: cached.successful_deliveries || 0,
    cancelledDeliveries: cached.cancelled_deliveries || 0,
    returnedDeliveries: cached.returned_deliveries || 0,
    successRate,
    courierBreakdown: cached.courier_stats || {},
    isNewCustomer: cached.total_deliveries === 0,
    checkedAt: cached.checked_at,
  };
}
