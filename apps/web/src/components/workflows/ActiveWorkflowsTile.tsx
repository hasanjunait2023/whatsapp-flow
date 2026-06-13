import { GitBranch, Workflow as WorkflowIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { m, staggerItem, useCountUp } from "@/lib/motion";

interface ActiveWorkflowsTileProps {
  /** Hero number — workflows currently switched on. */
  activeCount: number;
  /** Total workflows built (active + inactive). */
  totalCount: number;
  loading?: boolean;
}

/**
 * The single full-orange surface on the Workflows page (DESIGN.md §2.2).
 * Orange = the page focal point; every other tile here is a calm white card.
 */
export function ActiveWorkflowsTile({ activeCount, totalCount, loading = false }: ActiveWorkflowsTileProps) {
  const display = useCountUp(activeCount);

  if (loading) {
    return (
      <div className="flex h-full min-h-[180px] flex-col gap-4 rounded-card bg-primary/80 p-6">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-10 w-20 bg-white/30" />
        <Skeleton className="mt-auto h-4 w-32 bg-white/30" />
      </div>
    );
  }

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-card bg-primary p-6 text-primary-foreground shadow-elevation-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <WorkflowIcon className="h-4 w-4" aria-hidden />
              Active workflows
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <GitBranch className="h-4 w-4" aria-hidden />
            </span>
          </div>

          <p className="mt-2 tabular-nums text-4xl font-bold leading-none tracking-tight">
            {display.toLocaleString("en-US")}
          </p>

          <p className="mt-auto text-sm font-medium text-primary-foreground/85 tabular-nums">
            of {totalCount.toLocaleString("en-US")} {totalCount === 1 ? "workflow" : "workflows"} live
          </p>
        </div>
      </div>
    </m.div>
  );
}
