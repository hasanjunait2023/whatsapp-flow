import { useState, useMemo, useEffect, forwardRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Loader2, X } from 'lucide-react';
import type { AdminContact } from '@/hooks/useAdminContacts';
import { useAdminInboxContacts } from '@/hooks/useAdminInboxContacts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminCreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string | null;
  onSuccess?: (group: any) => void;
}

const AdminCreateGroupDialog = forwardRef<HTMLDivElement, AdminCreateGroupDialogProps>(({
  open,
  onOpenChange,
  instanceId,
  onSuccess,
}, ref) => {
  const { contacts, loading: loadingContacts } = useAdminInboxContacts({ instanceId });
  const [groupName, setGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);

  // Filter contacts based on instance and search
  const filteredContacts = useMemo(() => {
    let filtered = contacts;
    
    // Filter by instance if provided
    if (instanceId) {
      filtered = filtered.filter((c) => c.instance_id === instanceId);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.phone_number?.includes(query)
      );
    }
    
    return filtered;
  }, [contacts, instanceId, searchQuery]);

  const toggleContact = (contactId: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (!instanceId) {
      toast.error('No instance available');
      return;
    }
    if (selectedContacts.size === 0) {
      toast.error('Select at least one member');
      return;
    }

    setCreating(true);
    try {
      // Get phone numbers for selected contacts
      const phoneNumbers = contacts
        .filter((c) => selectedContacts.has(c.id))
        .map((c) => c.phone_number)
        .filter(Boolean);

      const { data, error } = await supabase.functions.invoke('group-create', {
        body: {
          instance_id: instanceId,
          group_name: groupName.trim(),
          participant_phone_numbers: phoneNumbers,
        },
      });

      if (error) throw error;

      toast.success('Group created!', {
        description: `${groupName} group created with ${phoneNumbers.length} members`,
      });

      onSuccess?.(data.group);
      handleClose();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group', {
        description: error?.message || 'Please try again',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedContacts(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

  const getContactInitials = (contact: AdminContact) => {
    if (contact.name) {
      return contact.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    return contact.phone_number?.slice(-2) || '??';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Create New Group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="VIP Leads, Support Team..."
              maxLength={50}
            />
          </div>

          {/* Selected Count */}
          {selectedContacts.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">
                {selectedContacts.size} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedContacts(new Set())}
                className="h-6 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>
          )}

          {/* Contact Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Contact List */}
          <ScrollArea className="flex-1 -mx-6 px-6 min-h-[200px]">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {instanceId
                  ? 'No contacts for this instance'
                  : 'No contacts available'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      checked={selectedContacts.has(contact.id)}
                      onCheckedChange={() => toggleContact(contact.id)}
                    />
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={contact.profile_pic_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getContactInitials(contact)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">
                        {contact.name || contact.phone_number}
                      </p>
                      {contact.name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.phone_number}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={
              creating ||
              !groupName.trim() ||
              !instanceId ||
              selectedContacts.size === 0
            }
            className="w-full"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Create Group
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

AdminCreateGroupDialog.displayName = 'AdminCreateGroupDialog';

export default AdminCreateGroupDialog;
