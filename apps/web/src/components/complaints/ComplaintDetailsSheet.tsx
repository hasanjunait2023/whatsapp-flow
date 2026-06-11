import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Package,
  Truck,
  CreditCard,
  HelpCircle,
  User,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  UserPlus,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus, useComplaints } from '@/hooks/useComplaints';
import { useTeam } from '@/hooks/useTeam';
import { cn } from '@/lib/utils';

interface ComplaintDetailsSheetProps {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function ComplaintDetailsSheet({
  complaint,
  open,
  onOpenChange,
  canManage,
}: ComplaintDetailsSheetProps) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newStatus, setNewStatus] = useState<ComplaintStatus | ''>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const { updateComplaint, resolveComplaint, assignComplaint } = useComplaints();
  const { members } = useTeam();

  if (!complaint) return null;

  const CategoryIcon = categoryIcons[complaint.category];
  const priorityStyle = priorityStyles[complaint.priority];
  const statusStyle = statusStyles[complaint.status];
  const isResolved = complaint.status === 'resolved' || complaint.status === 'closed';

  const handleStatusChange = async () => {
    if (!newStatus) return;

    if (newStatus === 'resolved') {
      await resolveComplaint.mutateAsync({
        id: complaint.id,
        notes: resolutionNotes,
        contactId: complaint.contact_id,
      });
    } else {
      await updateComplaint.mutateAsync({
        id: complaint.id,
        status: newStatus,
      });
    }

    setResolutionNotes('');
    setNewStatus('');
  };

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    await assignComplaint.mutateAsync({
      id: complaint.id,
      assigneeId: selectedAssignee === 'unassigned' ? null : selectedAssignee,
    });
    setSelectedAssignee('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg", priorityStyle.bg)}>
              <CategoryIcon className={cn("h-5 w-5", priorityStyle.text)} />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-left">{complaint.title}</SheetTitle>
              <SheetDescription className="text-left mt-1">
                {categoryLabels[complaint.category]}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & Priority */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(statusStyle.bg, statusStyle.text)}>
              {complaint.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className={cn(priorityStyle.bg, priorityStyle.text)}>
              {complaint.priority} priority
            </Badge>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          <Separator />

          {/* Customer & Order Info */}
          <div className="space-y-3">
            {complaint.contact && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {complaint.contact.name || 'Unknown Customer'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {complaint.contact.phone_number}
                  </p>
                </div>
              </div>
            )}

            {complaint.order && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Order #{complaint.order.order_number}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Reporter Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={complaint.reporter?.avatar_url || undefined} />
                <AvatarFallback>
                  {complaint.reporter?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {complaint.reporter?.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Reported {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Current Assignee */}
            {complaint.assignee && (
              <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={complaint.assignee.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {complaint.assignee.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Assigned to {complaint.assignee.full_name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Resolution Info (if resolved) */}
          {isResolved && complaint.resolved_at && (
            <>
              <Separator />
              <div className="p-4 bg-green-500/10 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Resolved</span>
                </div>
                {complaint.resolution_notes && (
                  <p className="text-sm text-muted-foreground">
                    {complaint.resolution_notes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(complaint.resolved_at), 'PPp')}
                </p>
              </div>
            </>
          )}

          {/* Manager Actions */}
          {canManage && !isResolved && (
            <>
              <Separator />
              
              {/* Assignment Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Assign To
                </h4>
                <div className="flex gap-2">
                  <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.profile?.full_name || member.profile?.email || 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssign}
                    disabled={!selectedAssignee}
                    loading={assignComplaint.isPending}
                    size="sm"
                  >
                    Assign
                  </Button>
                </div>
              </div>

              <Separator />
              
              {/* Status Update Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Update Status
                </h4>

                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ComplaintStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Change status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                {newStatus === 'resolved' && (
                  <Textarea
                    placeholder="Resolution notes..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                )}

                <Button
                  onClick={handleStatusChange}
                  disabled={!newStatus}
                  loading={updateComplaint.isPending || resolveComplaint.isPending}
                  className="w-full"
                >
                  {newStatus === 'resolved' ? 'Resolve Complaint' : 'Update Status'}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
