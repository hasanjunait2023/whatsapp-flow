import { m } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface StatusDotProps {
  /** Raw connection status from the instance (e.g. "active", "disconnected"). */
  status: string;
  className?: string;
}

const TONE: Record<string, { dot: string; halo: string; label: string }> = {
  active: { dot: 'bg-success', halo: 'bg-success/40', label: 'Connected' },
  disconnected: { dot: 'bg-muted-foreground', halo: 'bg-muted-foreground/30', label: 'Disconnected' },
  banned: { dot: 'bg-destructive', halo: 'bg-destructive/40', label: 'Banned' },
};

/**
 * Connection status dot. Isolated client component so the only perpetual
 * animation in the page (a gentle pulse on live connections) is scoped here.
 * The pulse is a transform/opacity loop on a separate halo element, so it stays
 * compositor-friendly and collapses to a static dot under prefers-reduced-motion
 * (handled globally by MotionConfig reducedMotion="user").
 */
export function StatusDot({ status, className }: StatusDotProps) {
  const tone = TONE[status] ?? TONE.disconnected;
  const isLive = status === 'active';

  return (
    <span
      className={cn('relative inline-flex h-2.5 w-2.5 shrink-0', className)}
      role="img"
      aria-label={tone.label}
    >
      {isLive && (
        <m.span
          aria-hidden
          className={cn('absolute inset-0 rounded-full', tone.halo)}
          animate={{ scale: [1, 2.1, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', tone.dot)} />
    </span>
  );
}
