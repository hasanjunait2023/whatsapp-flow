import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Check, X, Clock, ChevronDown, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { AdminAccessRequest, useAdminRequests } from '@/hooks/useAdminRequests';
import { PERMISSION_LABELS, AdminPermissions } from '@/hooks/useAdminPermissions';

interface PendingRequestsCardProps {
  requests: AdminAccessRequest[];
  loading: boolean;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
}

function RequestItem({ 
  request, 
  onApprove, 
  onReject 
}: { 
  request: AdminAccessRequest;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const enabledPermissions = Object.entries(request.permissions)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => PERMISSION_LABELS[key as keyof AdminPermissions]);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await onApprove(request.id, notes);
      toast.success('Request approved');
    } catch (err) {
      toast.error('Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      await onReject(request.id, notes);
      toast.success('Request rejected');
    } catch (err) {
      toast.error('Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {request.user_name?.charAt(0) || request.user_email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{request.user_name || request.user_email || 'Unknown'}</p>
              {request.user_name && request.user_email && (
                <p className="text-sm text-muted-foreground">{request.user_email}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground">
          Requested by <span className="font-medium text-foreground">{request.requester_name || request.requester_email}</span>
          {' • '}
          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
        </div>

        {request.reason && (
          <div className="text-sm bg-muted/50 p-2 rounded">
            "{request.reason}"
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {enabledPermissions.slice(0, 4).map((perm) => (
            <Badge key={perm} variant="secondary" className="text-xs">
              {perm}
            </Badge>
          ))}
          {enabledPermissions.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{enabledPermissions.length - 4} more
            </Badge>
          )}
        </div>

        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full">
            <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Hide Details' : 'Show Details & Actions'}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          <div>
            <p className="text-sm font-medium mb-2">All Permissions:</p>
            <div className="flex flex-wrap gap-1">
              {enabledPermissions.map((perm) => (
                <Badge key={perm} variant="outline" className="text-xs">
                  {perm}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Review Notes (optional):</p>
            <Textarea
              placeholder="Add notes about your decision..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleReject}
              disabled={processing}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              className="flex-1"
              onClick={handleApprove}
              disabled={processing}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function PendingRequestsCard({ requests, loading, onApprove, onReject }: PendingRequestsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Pending Requests
          {requests.length > 0 && (
            <Badge variant="secondary">{requests.length}</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Admin access requests awaiting approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No pending requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
