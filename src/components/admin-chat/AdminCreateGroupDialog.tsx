import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAdminTeam } from '@/hooks/useAdminTeam';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(50, 'Name is too long'),
  memberIds: z.array(z.string()).min(1, 'Select at least one member'),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminCreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGroup: (name: string, memberIds: string[]) => Promise<void>;
}

export function AdminCreateGroupDialog({ open, onOpenChange, onCreateGroup }: AdminCreateGroupDialogProps) {
  const { members } = useAdminTeam();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      memberIds: [],
    },
  });

  const selectedMemberIds = form.watch('memberIds');

  const handleClose = () => {
    if (!loading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await onCreateGroup(values.name, values.memberIds);
      toast({
        title: 'Group created',
        description: `${values.name} has been created with ${values.memberIds.length} members`,
      });
      handleClose();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    const current = form.getValues('memberIds');
    if (current.includes(userId)) {
      form.setValue('memberIds', current.filter(id => id !== userId));
    } else {
      form.setValue('memberIds', [...current, userId]);
    }
  };

  const selectedMembers = members.filter(m => selectedMemberIds.includes(m.user_id));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Admin Group Chat
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., All Admins" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedMembers.map((member) => (
                  <Badge
                    key={member.user_id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {member.profile?.full_name || member.profile?.email || 'Unknown'}
                    <button
                      type="button"
                      onClick={() => toggleMember(member.user_id)}
                      className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <FormField
              control={form.control}
              name="memberIds"
              render={() => (
                <FormItem>
                  <FormLabel>Select Admin Members</FormLabel>
                  <ScrollArea className="h-48 rounded-md border">
                    <div className="p-2 space-y-1">
                      {members.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                          onClick={() => toggleMember(member.user_id)}
                        >
                          <Checkbox
                            checked={selectedMemberIds.includes(member.user_id)}
                            onCheckedChange={() => toggleMember(member.user_id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.profile?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.profile?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.profile?.email}
                            </p>
                          </div>
                          {member.is_super_admin && (
                            <Badge variant="outline" className="text-xs">
                              Super Admin
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
