import { cn } from '@/lib/utils';
import type { PresenceStatus } from '@/hooks/useTeamPresence';

interface PresenceIndicatorProps {
  status: PresenceStatus | boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPulse?: boolean;
}

export function PresenceIndicator({ 
  status, 
  size = 'md', 
  className,
  showPulse = true 
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  // Handle boolean (legacy) or PresenceStatus
  const normalizedStatus: PresenceStatus = 
    typeof status === 'boolean' 
      ? (status ? 'online' : 'offline')
      : status;

  const statusClasses = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-muted-foreground/40',
  };

  const statusLabels = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline',
  };

  return (
    <span
      className={cn(
        'rounded-full ring-2 ring-background relative',
        sizeClasses[size],
        statusClasses[normalizedStatus],
        className
      )}
      aria-label={statusLabels[normalizedStatus]}
    >
      {showPulse && normalizedStatus === 'online' && (
        <span 
          className={cn(
            'absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75',
          )} 
        />
      )}
    </span>
  );
}
