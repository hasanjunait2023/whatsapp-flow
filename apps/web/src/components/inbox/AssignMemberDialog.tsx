import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeam } from '@/hooks/useTeam';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssignMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  currentAssignee: string | null;
  onAssigned?: (userId: string | null) => void;
}

export default function AssignMemberDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  currentAssignee,
  onAssigned,
}: AssignMemberDialogProps) {
  const { members, loading } = useTeam();
  const { currentTenant } = useTenant();
  const [processing, setProcessing] = useState(false);

  const handleAssign = async (userId: string | null) => {
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ assigned_to: userId })
        .eq('id', contactId);

      if (error) throw error;

      // Create notification for the assigned user
      if (userId && currentTenant) {
        const { error: notifError } = await supabase
          .from('in_app_notifications')
          .insert({
            tenant_id: currentTenant.id,
            user_id: userId,
            type: 'contact_assigned',
            title: 'New Contact Assigned',
            message: `You have been assigned to handle ${contactName}`,
            entity_type: 'contact',
            entity_id: contactId,
            metadata: { contact_name: contactName },
          });

        // notifError is non-critical; assignment itself succeeded
      }

      onAssigned?.(userId);
      toast.success(userId ? 'Contact assigned' : 'Contact unassigned');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update assignment');
    } finally {
      setProcessing(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Team Member</DialogTitle>
          <DialogDescription>
            Assign {contactName} to a team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Assignment */}
          {currentAssignee && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-sm text-primary font-medium">
                Currently assigned to:{' '}
                {members.find((m) => m.user_id === currentAssignee)?.profile?.full_name || 'Unknown'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAssign(null)}
                disabled={processing}
                className="text-destructive hover:text-destructive"
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Unassign
              </Button>
            </div>
          )}

          {/* Team Members List */}
          <div>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {members.map((member) => {
                    const isAssigned = currentAssignee === member.user_id;
                    const displayName = member.profile?.full_name || member.profile?.email || 'Unknown';
                    const initials = displayName.slice(0, 2).toUpperCase();

                    return (
                      <button
                        key={member.id}
                        onClick={() => handleAssign(member.user_id)}
                        disabled={processing || isAssigned}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors",
                          isAssigned
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-accent border border-transparent",
                          "disabled:opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="text-sm font-medium">{displayName}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs capitalize">
                                {member.role}
                              </Badge>
                              {member.profile?.email && (
                                <span className="text-xs text-muted-foreground">
                                  {member.profile.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isAssigned && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    );
                  })}
                  {members.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No team members found
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
