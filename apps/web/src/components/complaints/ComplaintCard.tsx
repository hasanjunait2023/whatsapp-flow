import { formatDistanceToNow } from 'date-fns';
import { Package, Truck, CreditCard, HelpCircle, MoreVertical, User, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus } from '@/hooks/useComplaints';
import { cn } from '@/lib/utils';

interface ComplaintCardProps {
  complaint: Complaint;
  onView: (complaint: Complaint) => void;
  onDelete?: (id: string) => void;
  canManage?: boolean;
}

const categoryIcons: Record<ComplaintCategory, React.ElementType> = {
  product_issue: Package,
  delivery: Truck,
  refund: CreditCard,
  other: HelpCircle,
};

const categoryLabels: Record<ComplaintCategory, string> = {
  product_issue: 'Product Issue',
  delivery: 'Delivery',
  refund: 'Refund',
  other: 'Other',
};

const priorityStyles: Record<ComplaintPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-muted', text: 'text-muted-foreground' },
  medium: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  high: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  critical: { bg: 'bg-destructive/10', text: 'text-destructive' },
};

const statusStyles: Record<ComplaintStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  in_progress: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  resolved: { bg: 'bg-green-500/10', text: 'text-green-500' },
  closed: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

export function ComplaintCard({ complaint, onView, onDelete, canManage }: ComplaintCardProps) {
  const CategoryIcon = categoryIcons[complaint.category];
  const priorityStyle = priorityStyles[complaint.priority];
  const statusStyle = statusStyles[complaint.status];

  return (
    <div
      className={cn(
        "group p-4 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer",
        complaint.priority === 'critical' && complaint.status !== 'resolved' && complaint.status !== 'closed' && 
          "border-destructive/50 animate-pulse-subtle"
      )}
      onClick={() => onView(complaint)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn("p-2 rounded-lg shrink-0", priorityStyle.bg)}>
            <CategoryIcon className={cn("h-4 w-4", priorityStyle.text)} />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium truncate">{complaint.title}</h3>
              <Badge variant="outline" className={cn("text-xs", statusStyle.bg, statusStyle.text)}>
                {complaint.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", priorityStyle.bg, priorityStyle.text)}>
                {complaint.priority}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {complaint.description}
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {complaint.contact && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{complaint.contact.name || complaint.contact.phone_number}</span>
                </div>
              )}
              
              {complaint.order && (
                <div className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  <span>#{complaint.order.order_number}</span>
                </div>
              )}

              <Badge variant="secondary" className="text-xs">
                {categoryLabels[complaint.category]}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={complaint.reporter?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {complaint.reporter?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {complaint.reporter?.full_name || 'Unknown'} • {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(complaint); }}>
              View Details
            </DropdownMenuItem>
            {canManage && onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(complaint.id); }}
                >
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
