import { Phone, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { m, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { StatusDot } from './StatusDot';
import type {
  NumberHealthInstance,
  NumberHealthStatus,
  WarmupPhase,
} from '@/hooks/useNumberHealth';

/** Days of sustained warm-up before a number is considered fully ramped. */
const WARMUP_TARGET_DAYS = 22;

const PHASE_ORDER: WarmupPhase[] = ['new', 'warming', 'ramp', 'ready'];

const PHASE_LABEL: Record<WarmupPhase, string> = {
  new: 'New',
  warming: 'Warming',
  ramp: 'Ramping',
  ready: 'Ready',
};

const HEALTH_PILL: Record<NumberHealthStatus, { label: string; className: string }> = {
  good: { label: 'Good', className: 'bg-success-soft text-success' },
  watch: { label: 'Watch', className: 'bg-warning-soft text-warning' },
  at_risk: { label: 'At risk', className: 'bg-destructive-soft text-destructive' },
};

/** Reply-rate thresholds → semantic tone (≥30% good, 15–30% watch, <15% risk). */
function replyTone(rate: number): { text: string; bar: string } {
  if (rate >= 0.3) return { text: 'text-success', bar: 'bg-success' };
  if (rate >= 0.15) return { text: 'text-warning', bar: 'bg-warning' };
  return { text: 'text-destructive', bar: 'bg-destructive' };
}

function pct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function MetaStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
        {value.toLocaleString('en-US')}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function NumberHealthTile({ instance }: { instance: NumberHealthInstance }) {
  const health = HEALTH_PILL[instance.health] ?? HEALTH_PILL.watch;
  const reply = replyTone(instance.reply_rate);
  const replyPct = pct(instance.reply_rate * 100);

  const warmupPct = pct((instance.warmup_day / WARMUP_TARGET_DAYS) * 100);
  const phaseIndex = Math.max(0, PHASE_ORDER.indexOf(instance.warmup_phase));

  const usagePct = instance.daily_cap > 0 ? pct((instance.sent_today / instance.daily_cap) * 100) : 0;
  const usageHot = usagePct > 80;

  const title = instance.name?.trim() || instance.phone_number || 'Unnamed number';
  const subtitle = instance.name?.trim() && instance.phone_number ? instance.phone_number : null;

  return (
    <m.article
      variants={staggerItem}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col gap-5 rounded-card border border-border/70 bg-card p-6 shadow-elevation-1"
    >
      {/* Header: identity + health pill */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <StatusDot status={instance.status} className="mt-1.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
              <h3 className="truncate font-mono text-sm font-semibold text-foreground">{title}</h3>
            </div>
            {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
            health.className,
          )}
        >
          {health.label}
        </span>
      </header>

      {/* Warm-up progress */}
      <section aria-label="Warm-up progress">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs font-medium text-muted-foreground">Warm-up</span>
          <span className="text-xs font-medium text-foreground">
            {PHASE_LABEL[instance.warmup_phase] ?? 'Warming'}
            <span className="ml-1.5 font-mono tabular-nums text-muted-foreground">
              day {instance.warmup_day}
            </span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground/70 transition-[width] duration-500"
            style={{ width: `${warmupPct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center gap-1" aria-hidden>
          {PHASE_ORDER.map((phase, i) => (
            <span
              key={phase}
              className={cn(
                'h-1 flex-1 rounded-full',
                i <= phaseIndex ? 'bg-foreground/40' : 'bg-muted',
              )}
            />
          ))}
        </div>
      </section>

      {/* Reply rate + today usage */}
      <section className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs font-medium text-muted-foreground">Reply rate</span>
          <p className={cn('mt-0.5 font-mono text-2xl font-bold tabular-nums leading-none', reply.text)}>
            {replyPct}
            <span className="text-base font-semibold">%</span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-[width] duration-500', reply.bar)}
              style={{ width: `${replyPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted-foreground">Today</span>
            <span
              className={cn(
                'font-mono text-xs tabular-nums',
                usageHot ? 'text-warning' : 'text-muted-foreground',
              )}
            >
              {instance.sent_today}/{instance.daily_cap}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums leading-none text-foreground">
            {usagePct}
            <span className="text-base font-semibold">%</span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500',
                usageHot ? 'bg-warning' : 'bg-foreground/60',
              )}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      </section>

      {/* 7-day traffic */}
      <footer className="flex items-center gap-5 border-t border-border/60 pt-4">
        <MetaStat icon={ArrowUpRight} label="sent 7d" value={instance.sent_7d} />
        <MetaStat icon={ArrowDownLeft} label="received 7d" value={instance.received_7d} />
      </footer>
    </m.article>
  );
}
