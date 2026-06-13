import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // `.shimmer` animates background-position only (compositor-safe) — see index.css.
  return <div className={cn("shimmer rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
