import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ArrowRight, Package, Truck, CreditCard, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useComplaints, Complaint, ComplaintCategory, ComplaintPriority } from '@/hooks/useComplaints';
import { cn } from '@/lib/utils';

const categoryIcons: Record<ComplaintCategory, React.ElementType> = {
  product_issue: Package,
  delivery: Truck,
  refund: CreditCard,
  other: HelpCircle,
};

const priorityStyles: Record<ComplaintPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-muted', text: 'text-muted-foreground' },
  medium: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  high: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  critical: { bg: 'bg-destructive/10', text: 'text-destructive' },
};

export function ComplaintsWidget() {
  const { complaints, stats, isLoading } = useComplaints();

  // Get recent open complaints (max 5)
  const recentComplaints = complaints
    .filter((c) => c.status === 'open' || c.status === 'in_progress')
    .slice(0, 5);

  // Get critical complaints count
  const criticalCount = stats.critical;

  if (isLoading) {
    return (
      <Card hover="lift">
        <CardHeader className="pb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card hover="lift">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              criticalCount > 0 ? "bg-destructive/10" : "bg-amber-500/10"
            )}>
              <AlertTriangle className={cn(
                "h-5 w-5",
                criticalCount > 0 ? "text-destructive" : "text-amber-500"
              )} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Customer Complaints
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {criticalCount} Critical
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {stats.open} open, {stats.in_progress} in progress
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/complaints">
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentComplaints.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No open complaints</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentComplaints.map((complaint) => (
              <ComplaintItem key={complaint.id} complaint={complaint} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComplaintItem({ complaint }: { complaint: Complaint }) {
  const CategoryIcon = categoryIcons[complaint.category];
  const priorityStyle = priorityStyles[complaint.priority];

  return (
    <Link to="/complaints" className="block">
      <div className={cn(
        "flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors",
        complaint.priority === 'critical' && "border-destructive/30 animate-pulse-subtle"
      )}>
        <div className={cn("p-1.5 rounded-lg shrink-0", priorityStyle.bg)}>
          <CategoryIcon className={cn("h-4 w-4", priorityStyle.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{complaint.title}</p>
            <Badge 
              variant="outline" 
              className={cn("text-[10px] shrink-0", priorityStyle.bg, priorityStyle.text)}
            >
              {complaint.priority}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {complaint.contact && (
              <span className="text-xs text-muted-foreground truncate">
                {complaint.contact.name || complaint.contact.phone_number}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              • {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
