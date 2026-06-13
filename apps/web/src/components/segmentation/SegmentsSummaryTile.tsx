import { Layers, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { m, staggerItem, useCountUp } from '@/lib/motion';

interface SegmentsSummaryTileProps {
  /** Hero number — total contacts across all segments. */
  totalMembers: number;
  /** Count of segments contributing members. */
  segmentCount: number;
  loading?: boolean;
}

/**
 * The single full-orange surface on the Segmentation page (DESIGN.md §2.2).
 * Headline metric = total segmented contacts. Tokens only — no raw hex.
 */
export function SegmentsSummaryTile({ totalMembers, segmentCount, loading = false }: SegmentsSummaryTileProps) {
  const display = useCountUp(totalMembers);

  if (loading) {
    return (
      <div className="flex h-full min-h-[148px] flex-col gap-4 rounded-card bg-primary/80 p-6">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-10 w-24 bg-white/30" />
        <Skeleton className="mt-auto h-4 w-32 bg-white/30" />
      </div>
    );
  }

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-card bg-primary p-6 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <Users className="h-4 w-4" aria-hidden />
              Segmented contacts
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-white/15">
              <Layers className="h-4 w-4" aria-hidden />
            </span>
          </div>
          <p className="mt-3 tabular-nums text-4xl font-bold leading-none tracking-tight md:text-5xl">
            {display.toLocaleString('en-US')}
          </p>
          <p className="mt-auto pt-3 text-xs text-primary-foreground/80 tabular-nums">
            across {segmentCount.toLocaleString('en-US')} {segmentCount === 1 ? 'segment' : 'segments'}
          </p>
        </div>
      </div>
    </m.div>
  );
}
