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
import { Check, UserMinus, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminTeam } from '@/hooks/useAdminTeam';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminAssignMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  currentAssignee: string | null;
  onAssigned?: (userId: string | null) => void;
}

export default function AdminAssignMemberDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  currentAssignee,
  onAssigned,
}: AdminAssignMemberDialogProps) {
  const { members, loading } = useAdminTeam();
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
      if (userId) {
        const { error: notifError } = await supabase
          .from('admin_notifications')
          .insert({
            type: 'contact_assigned',
            title: 'New Contact Assigned',
            message: `You have been assigned to handle ${contactName}`,
            user_id: userId,
            entity_type: 'contact',
            entity_id: contactId,
            metadata: { contact_name: contactName },
          });

        if (notifError) {
          console.warn('Failed to create assignment notification:', notifError);
        }
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
                              <Badge 
                                variant={member.is_super_admin ? 'default' : 'secondary'} 
                                className="text-xs capitalize"
                              >
                                {member.is_super_admin && <Shield className="h-3 w-3 mr-1" />}
                                {member.is_super_admin ? 'Super Admin' : 'Admin'}
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
                      No admin team members found
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
