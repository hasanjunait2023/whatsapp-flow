import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface UserMentionPopoverProps {
  users: User[];
  isOpen: boolean;
  searchQuery: string;
  onSelect: (user: User) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

export function UserMentionPopover({
  users,
  isOpen,
  searchQuery,
  onSelect,
  onClose,
  anchorRef,
}: UserMentionPopoverProps) {
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverTrigger asChild>
        <span ref={anchorRef as any} className="absolute" />
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0" 
        side="top" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            <CommandEmpty>No users found</CommandEmpty>
            <CommandGroup heading="Team Members">
              {filteredUsers.slice(0, 6).map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => onSelect(user)}
                  className="cursor-pointer"
                >
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.full_name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
