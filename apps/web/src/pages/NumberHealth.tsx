import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { m, pageEnter, staggerContainer } from '@/lib/motion';
import { RefreshCw, ShieldAlert, Smartphone, AlertCircle } from 'lucide-react';
import { useNumberHealth } from '@/hooks/useNumberHealth';
import { NumberHealthTile } from '@/components/number-health/NumberHealthTile';

/** Thin summary strip — divide separators, not boxed cards (bento header rail). */
function SummaryStrip({
  total,
  sentToday,
  optedOut,
}: {
  total: number;
  sentToday: number;
  optedOut: number;
}) {
  const items = [
    { label: 'Connected numbers', value: total.toLocaleString('en-US') },
    { label: 'Sent today', value: sentToday.toLocaleString('en-US') },
    { label: 'Opt-outs', value: optedOut.toLocaleString('en-US') },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-border/70 rounded-card border border-border/70 bg-card">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4 sm:px-6 sm:py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums leading-none text-foreground sm:text-3xl">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function TileSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-card border border-border/70 bg-card p-6 shadow-elevation-1">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2.5">
          <Skeleton className="mt-1.5 h-2.5 w-2.5 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-1 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-5 border-t border-border/60 pt-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Smartphone className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">No connected numbers yet</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Connect a WhatsApp number to start tracking its warm-up progress, reply rate, and ban-risk
        health here.
      </p>
      <Button asChild className="mt-5">
        <a href="/instances">Connect a number</a>
      </Button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-destructive/30 bg-destructive-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" strokeWidth={1.75} aria-hidden />
        <div>
          <p className="text-sm font-medium text-foreground">Couldn't load number health</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
        <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.75} />
        Retry
      </Button>
    </div>
  );
}

export default function NumberHealth() {
  const { data, isLoading, isError, error, isFetching, refetch } = useNumberHealth();

  const instances = data?.instances ?? [];
  const optedOut = data?.opted_out_count ?? 0;
  const sentToday = instances.reduce((sum, i) => sum + (i.sent_today ?? 0), 0);

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8"
      >
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-control bg-muted">
              <ShieldAlert className="h-5 w-5 text-foreground" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Number Health</h1>
              <p className="text-sm text-muted-foreground">
                Warm-up progress and ban-risk signals per connected WhatsApp number.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
            />
            Refresh
          </Button>
        </header>

        {/* Error */}
        {isError && (
          <ErrorState
            message={error instanceof Error ? error.message : 'Something went wrong.'}
            onRetry={() => refetch()}
          />
        )}

        {/* Loading */}
        {isLoading && (
          <>
            <div className="grid grid-cols-3 divide-x divide-border/70 rounded-card border border-border/70 bg-card">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2 px-5 py-4 sm:px-6 sm:py-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <TileSkeleton key={i} />
              ))}
            </div>
          </>
        )}

        {/* Loaded */}
        {!isLoading && !isError && (
          <>
            <SummaryStrip total={instances.length} sentToday={sentToday} optedOut={optedOut} />

            {instances.length === 0 ? (
              <EmptyState />
            ) : (
              <m.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
              >
                {instances.map((instance) => (
                  <NumberHealthTile key={instance.instance_id} instance={instance} />
                ))}
              </m.div>
            )}
          </>
        )}
      </m.div>
    </DashboardLayout>
  );
}
