import { cn } from '@/lib/utils';

interface PresenceIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PresenceIndicator({ isOnline, size = 'md', className }: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <span
      className={cn(
        'rounded-full ring-2 ring-background',
        sizeClasses[size],
        isOnline ? 'bg-green-500' : 'bg-muted-foreground/40',
        className
      )}
      aria-label={isOnline ? 'Online' : 'Offline'}
    />
  );
}
