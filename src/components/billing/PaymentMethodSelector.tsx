import { CreditCard, Smartphone, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethodSelectorProps {
  value: 'online' | 'manual';
  onChange: (value: 'online' | 'manual') => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({ value, onChange, disabled }: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Online Payment Option */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('online')}
        className={cn(
          'relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
          'hover:border-primary/50 hover:bg-primary/5',
          value === 'online'
            ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
            : 'border-border bg-card',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Recommended badge */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
            <Zap className="h-3 w-3" />
            Recommended
          </span>
        </div>
        
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <CreditCard className="h-6 w-6 text-primary-foreground" />
        </div>
        
        <div className="text-center">
          <p className="font-semibold text-foreground">Pay Online</p>
          <p className="text-xs text-muted-foreground mt-1">
            bKash, Nagad, Rocket, Bank
          </p>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <Zap className="h-3 w-3" />
          <span>Instant Activation</span>
        </div>
      </button>

      {/* Manual Payment Option */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('manual')}
        className={cn(
          'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
          'hover:border-primary/50 hover:bg-primary/5',
          value === 'manual'
            ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
            : 'border-border bg-card',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Smartphone className="h-6 w-6 text-muted-foreground" />
        </div>
        
        <div className="text-center">
          <p className="font-semibold text-foreground">Manual Payment</p>
          <p className="text-xs text-muted-foreground mt-1">
            Send & Submit TrxID
          </p>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>1-2 Hours Verification</span>
        </div>
      </button>
    </div>
  );
}
