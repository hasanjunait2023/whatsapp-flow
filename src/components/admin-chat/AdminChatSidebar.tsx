import { useState, useMemo } from 'react';
import { Plus, Search, MessageSquare, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChatRoomItem } from '@/components/internal-chat/ChatRoomItem';
import { AdminCreateGroupDialog } from './AdminCreateGroupDialog';
import { useAdminTeam } from '@/hooks/useAdminTeam';
import { useAdminPresence } from '@/hooks/useAdminPresence';
import { useAuth } from '@/hooks/useAuth';

interface ChatMember {
  id: string;
  user_id: string;
  profile?: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ChatRoom {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  members?: ChatMember[];
  last_message?: {
    content: string | null;
    content_type: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count?: number;
}

interface AdminChatSidebarProps {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  onSelectRoom: (room: ChatRoom) => void;
  onCreateDirectChat: (userId: string) => Promise<any>;
  onCreateGroupChat: (name: string, memberIds: string[]) => Promise<void>;
  loading?: boolean;
}

export function AdminChatSidebar({
  rooms,
  currentRoomId,
  onSelectRoom,
  onCreateDirectChat,
  onCreateGroupChat,
  loading,
}: AdminChatSidebarProps) {
  const { user } = useAuth();
  const { members, loading: teamLoading } = useAdminTeam();
  const { isOnline } = useAdminPresence();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Filter rooms by search
  const filteredRooms = useMemo(() => {
    if (!search.trim()) return rooms;
    
    const query = search.toLowerCase();
    return rooms.filter(room => {
      if (room.type === 'group') {
        return room.name?.toLowerCase().includes(query);
      }
      const otherMember = room.members?.find(m => m.user_id !== user?.id);
      return (
        otherMember?.profile?.full_name?.toLowerCase().includes(query) ||
        otherMember?.profile?.email?.toLowerCase().includes(query)
      );
    });
  }, [rooms, search, user?.id]);

  // Separate direct and group chats
  const directChats = filteredRooms.filter(r => r.type === 'direct');
  const groupChats = filteredRooms.filter(r => r.type === 'group');

  // Get members not in direct chat already
  const availableMembers = useMemo(() => {
    const existingDirectChatUserIds = new Set<string>();
    rooms.forEach(room => {
      if (room.type === 'direct') {
        room.members?.forEach(m => {
          if (m.user_id !== user?.id) {
            existingDirectChatUserIds.add(m.user_id);
          }
        });
      }
    });
    
    return members.filter(m => 
      m.user_id !== user?.id && !existingDirectChatUserIds.has(m.user_id)
    );
  }, [members, rooms, user?.id]);

  const handleStartDirectChat = async (userId: string) => {
    try {
      const room = await onCreateDirectChat(userId);
      if (room) {
        onSelectRoom(room);
      }
      setShowNewChat(false);
    } catch (error) {
      console.error('Error creating direct chat:', error);
    }
  };

  return (
    <div className="w-full md:w-72 border-r md:border-r flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Admin Team Chat</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowNewChat(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreateGroup(true)}>
                <Users className="h-4 w-4 mr-2" />
                New Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Room list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new chat to begin</p>
            </div>
          ) : (
            <>
              {/* Direct chats */}
              {directChats.length > 0 && (
                <>
                  <div className="px-2 py-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Direct Messages
                    </span>
                  </div>
                  {directChats.map(room => {
                    const otherMember = room.members?.find(m => m.user_id !== user?.id);
                    return (
                      <ChatRoomItem
                        key={room.id}
                        room={room}
                        isSelected={room.id === currentRoomId}
                        isOnline={otherMember ? isOnline(otherMember.user_id) : false}
                        onClick={() => onSelectRoom(room)}
                      />
                    );
                  })}
                </>
              )}

              {/* Group chats */}
              {groupChats.length > 0 && (
                <>
                  {directChats.length > 0 && <Separator className="my-2" />}
                  <div className="px-2 py-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Groups
                    </span>
                  </div>
                  {groupChats.map(room => (
                    <ChatRoomItem
                      key={room.id}
                      room={room}
                      isSelected={room.id === currentRoomId}
                      onClick={() => onSelectRoom(room)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a Conversation with Admin</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            <div className="space-y-1">
              {teamLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                </div>
              ) : availableMembers.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground text-sm">
                  {members.length === 0 
                    ? 'No admin team members found.'
                    : 'All admins have existing conversations'}
                </p>
              ) : (
                availableMembers.map(member => (
                  <button
                    key={member.user_id}
                    onClick={() => handleStartDirectChat(member.user_id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profile?.full_name?.charAt(0) || member.profile?.email?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline(member.user_id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {member.profile?.full_name || member.profile?.email?.split('@')[0] || 'Admin'}
                        </p>
                        {member.is_super_admin && (
                          <Badge variant="secondary" className="text-xs">Super</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.profile?.email || 'No email'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <AdminCreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onCreateGroup={onCreateGroupChat}
      />
    </div>
  );
}
