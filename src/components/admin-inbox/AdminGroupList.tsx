import { useState, forwardRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { AdminGroupInboxItem } from '@/hooks/useAdminGroupInbox';

interface AdminGroupListProps {
  groups: AdminGroupInboxItem[];
  loading: boolean;
  selectedGroupId: string | null;
  onSelectGroup: (group: AdminGroupInboxItem) => void;
  onCreateGroup: () => void;
}

const AdminGroupList = forwardRef<HTMLDivElement, AdminGroupListProps>(({
  groups,
  loading,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
}, ref) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full border-r border-border bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Groups
          </h2>
          <Button size="sm" onClick={onCreateGroup} className="gap-1">
            <Plus className="h-4 w-4" />
            New Group
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Group List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No groups found' : 'No groups yet'}
            </p>
            {!searchQuery && (
              <Button
                variant="link"
                className="mt-2"
                onClick={onCreateGroup}
              >
                Create a new group
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className={cn(
                  'w-full p-4 text-left transition-colors hover:bg-accent/50',
                  selectedGroupId === group.id && 'bg-accent'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{group.name}</span>
                      {group.unread_count > 0 && (
                        <Badge variant="default" className="shrink-0">
                          {group.unread_count}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <span>{group.participant_count} members</span>
                      {group.last_message_at && (
                        <>
                          <span>·</span>
                          <span>
                            {formatDistanceToNow(new Date(group.last_message_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {group.last_message_preview && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {group.last_message_preview}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
});

AdminGroupList.displayName = 'AdminGroupList';

export default AdminGroupList;
