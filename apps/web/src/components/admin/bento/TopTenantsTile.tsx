import { Link } from "react-router-dom";
import { Building2, MessageSquare, Smartphone, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TopTenant {
  id: string;
  name: string;
  owner_email: string;
  subscription_status: string;
  message_count: number;
  instance_count: number;
}

interface TopTenantsTileProps {
  tenants: TopTenant[];
  loading?: boolean;
}

type SoftVariant = "success-soft" | "info-soft" | "warning-soft" | "destructive-soft" | "neutral-soft";

const STATUS_META: Record<string, { label: string; variant: SoftVariant }> = {
  active: { label: "Active", variant: "success-soft" },
  trialing: { label: "Trial", variant: "info-soft" },
  past_due: { label: "Past due", variant: "warning-soft" },
  suspended: { label: "Suspended", variant: "destructive-soft" },
  cancelled: { label: "Cancelled", variant: "destructive-soft" },
  expired: { label: "Expired", variant: "destructive-soft" },
};

function statusMeta(status: string): { label: string; variant: SoftVariant } {
  return STATUS_META[status] ?? { label: status === "none" ? "No plan" : status, variant: "neutral-soft" };
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

/** Top tenants by activity — restyled Table with soft status pills (DESIGN_SYSTEM §7). */
export function TopTenantsTile({ tenants, loading = false }: TopTenantsTileProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5 text-primary" aria-hidden />
          Top Tenants
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/tenants">
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {loading ? (
          <div className="space-y-3 px-6 py-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
              <Building2 className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">No tenant activity yet</p>
              <p className="text-xs text-muted-foreground">Active workspaces will show up here.</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-transparent backdrop-blur-none">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Workspace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead className="hidden pr-6 text-right sm:table-cell">Instances</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.slice(0, 5).map((tenant) => {
                const meta = statusMeta(tenant.subscription_status);
                return (
                  <TableRow key={tenant.id}>
                    <TableCell className="py-3 pl-6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-primary">
                          {initials(tenant.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{tenant.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{tenant.owner_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="inline-flex items-center justify-end gap-1.5 tabular-nums text-sm text-foreground">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        {tenant.message_count.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="hidden py-3 pr-6 text-right sm:table-cell">
                      <span className="inline-flex items-center justify-end gap-1.5 tabular-nums text-sm text-foreground">
                        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        {tenant.instance_count}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
