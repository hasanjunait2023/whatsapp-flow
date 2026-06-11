import { PurchaseBehaviorCheck } from '@/hooks/usePurchaseBehavior';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  Shield, 
  ShieldAlert, 
  RefreshCw, 
  Package, 
  CheckCircle2, 
  XCircle, 
  RotateCcw,
  Sparkles 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PurchaseBehaviorSummaryProps {
  behavior: PurchaseBehaviorCheck | null;
  onRefresh: () => void;
  onViewDetails: () => void;
  isRefreshing: boolean;
}

export function PurchaseBehaviorSummary({ 
  behavior, 
  onRefresh, 
  onViewDetails,
  isRefreshing 
}: PurchaseBehaviorSummaryProps) {
  if (!behavior) return null;

  const isNewCustomer = behavior.total_deliveries === 0;
  const successRate = behavior.total_deliveries > 0 
    ? Math.round((behavior.successful_deliveries / behavior.total_deliveries) * 100) 
    : 0;

  const getRiskConfig = (level: string | null) => {
    switch (level) {
      case 'low':
        return {
          icon: ShieldCheck,
          label: 'Low Risk',
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-600',
          borderColor: 'border-green-200',
        };
      case 'medium':
        return {
          icon: Shield,
          label: 'Medium Risk',
          bgColor: 'bg-yellow-500/10',
          textColor: 'text-yellow-600',
          borderColor: 'border-yellow-200',
        };
      case 'high':
        return {
          icon: ShieldAlert,
          label: 'High Risk',
          bgColor: 'bg-red-500/10',
          textColor: 'text-red-600',
          borderColor: 'border-red-200',
        };
      default:
        return {
          icon: Shield,
          label: 'Unknown',
          bgColor: 'bg-muted',
          textColor: 'text-muted-foreground',
          borderColor: 'border-border',
        };
    }
  };

  const riskConfig = getRiskConfig(behavior.risk_level);
  const RiskIcon = riskConfig.icon;

  return (
    <div 
      className={cn(
        "rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm",
        riskConfig.bgColor,
        riskConfig.borderColor
      )}
      onClick={onViewDetails}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", riskConfig.bgColor)}>
            <RiskIcon className={cn("h-4 w-4", riskConfig.textColor)} />
          </div>
          <span className={cn("text-sm font-semibold", riskConfig.textColor)}>
            {riskConfig.label}
          </span>
        </div>
        
        {isNewCustomer ? (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Sparkles className="h-3 w-3" />
            New Customer
          </Badge>
        ) : (
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] font-medium",
              successRate >= 70 ? "text-green-600 border-green-200" : 
              successRate >= 40 ? "text-yellow-600 border-yellow-200" : 
              "text-red-600 border-red-200"
            )}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {successRate}% Success
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      {!isNewCustomer && (
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <StatBox 
            value={behavior.total_deliveries} 
            label="Total" 
            icon={Package}
            iconColor="text-primary"
          />
          <StatBox 
            value={behavior.successful_deliveries} 
            label="Success" 
            icon={CheckCircle2}
            iconColor="text-green-500"
          />
          <StatBox 
            value={behavior.cancelled_deliveries} 
            label="Cancel" 
            icon={XCircle}
            iconColor="text-red-500"
          />
          <StatBox 
            value={behavior.returned_deliveries} 
            label="Return" 
            icon={RotateCcw}
            iconColor="text-yellow-500"
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          Checked {formatDistanceToNow(new Date(behavior.checked_at), { addSuffix: true })}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>
    </div>
  );
}

interface StatBoxProps {
  value: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

function StatBox({ value, label, icon: Icon, iconColor }: StatBoxProps) {
  return (
    <div className="text-center p-1.5 bg-background/60 rounded-md">
      <Icon className={cn("h-3 w-3 mx-auto mb-0.5", iconColor)} />
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
