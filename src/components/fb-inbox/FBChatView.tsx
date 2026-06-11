import { useEffect, useRef, useState, useCallback } from 'react';
import { FBContact } from '@/hooks/useFBContacts';
import { useFBMessages } from '@/hooks/useFBMessages';
import { useFBSendMessage } from '@/hooks/useFBSendMessage';
import { useFBLabels } from '@/hooks/useFBLabels';
import { Label } from '@/hooks/useLabels';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { format, isToday, isYesterday } from 'date-fns';
import { 
  MoreVertical, 
  UserRound, 
  Bot,
  MessageSquare,
  Tag,
  PanelRightOpen,
  PanelRightClose,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import FBMessageBubble from './FBMessageBubble';
import FBChatInput from './FBChatInput';
import FBTypingIndicator from './FBTypingIndicator';
import FBContactLabelsDialog from './FBContactLabelsDialog';
import { toast } from 'sonner';

// Format PSID as readable name when actual name is unavailable
const formatPsidAsName = (psid: string) => {
  if (psid.length > 8) {
    return `FB-${psid.slice(0, 4)}...${psid.slice(-4)}`;
  }
  return `FB-${psid}`;
};

interface FBChatViewProps {
  contact: FBContact;
  onMarkAsRead: (id: string) => void;
  onToggleDetails?: () => void;
  showDetailsPanel?: boolean;
}

export default function FBChatView({ 
  contact, 
  onMarkAsRead,
  onToggleDetails,
  showDetailsPanel 
}: FBChatViewProps) {
  const { messages, loading, addOptimisticMessage, updateOptimisticMessage } = useFBMessages(contact.id);
  const { sendMessage, sending } = useFBSendMessage();
  const { getFBContactLabels } = useFBLabels();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [labelsDialogOpen, setLabelsDialogOpen] = useState(false);
  const [contactLabels, setContactLabels] = useState<Label[]>([]);
  const [contactMeta, setContactMeta] = useState<{
    name: string | null;
    profile_pic_url: string | null;
    psid: string;
  } | null>(null);
  
  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Mark as read when viewing - use ref to avoid re-render loop
  const onMarkAsReadRef = useRef(onMarkAsRead);
  onMarkAsReadRef.current = onMarkAsRead;
  
  useEffect(() => {
    if (contact.unread_count > 0) {
      onMarkAsReadRef.current(contact.id);
    }
  }, [contact.id, contact.unread_count]);

  // Load contact labels
  useEffect(() => {
    let cancelled = false;
    getFBContactLabels(contact.id)
      .then(labels => {
        if (!cancelled) setContactLabels(labels);
      })
      .catch(err => {
        if (!cancelled) console.error('Failed to load contact labels:', err);
      });
    return () => { cancelled = true; };
  }, [contact.id, getFBContactLabels, labelsDialogOpen]);

  // Track if user has scrolled up
  const userScrolledRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  // Scroll to bottom only when new messages are added (not on every render)
  useEffect(() => {
    const newMessageCount = messages.length;
    const hadNewMessages = newMessageCount > lastMessageCountRef.current;
    lastMessageCountRef.current = newMessageCount;

    // Only auto-scroll if new messages arrived and user hasn't scrolled up
    if (hadNewMessages && !userScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Detect when user scrolls up
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    userScrolledRef.current = !isAtBottom;
  }, []);

  // Fetch & keep contact meta (name/avatar) in sync so header shows customer name
  useEffect(() => {
    let cancelled = false;

    const fetchMeta = async () => {
      const { data } = await supabase
        .from('fb_contacts')
        .select('name, profile_pic_url, psid')
        .eq('id', contact.id)
        .maybeSingle();
      if (!cancelled && data) {
        setContactMeta({
          name: data.name ?? null,
          profile_pic_url: data.profile_pic_url ?? null,
          psid: data.psid,
        });
      }
    };

    fetchMeta();

    const channel = supabase
      .channel(`fb_contact_${contact.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fb_contacts',
          filter: `id=eq.${contact.id}`,
        },
        (payload) => {
          const next = payload.new as { name: string | null; profile_pic_url: string | null; psid: string };
          setContactMeta({
            name: next.name ?? null,
            profile_pic_url: next.profile_pic_url ?? null,
            psid: next.psid,
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [contact.id]);

  const handleSendMessage = async (content: string, mediaUrl?: string, contentType?: string) => {
    try {
      await sendMessage(
        {
          contact_id: contact.id,
          content,
          content_type: (contentType as any) || 'text',
          media_url: mediaUrl,
        },
        {
          onOptimisticAdd: addOptimisticMessage,
          onOptimisticUpdate: updateOptimisticMessage,
        }
      );
      // No refetch needed - optimistic UI + realtime handles it
    } catch (error) {
      toast.error('Failed to send message');
      throw error;
    }
  };

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Group messages by date
  const messagesByDate = messages.reduce((groups, message) => {
    // Safely handle null/invalid sent_at
    const sentAt = message.sent_at ? new Date(message.sent_at) : new Date();
    const dateKey = !isNaN(sentAt.getTime()) ? format(sentAt, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);

  const effectiveName = contactMeta?.name ?? contact.name ?? null;
  const effectivePsid = contactMeta?.psid ?? contact.psid;
  const displayName = effectiveName || formatPsidAsName(effectivePsid);
  const initials = displayName.slice(0, 2).toUpperCase();

  // Handle name save
  const handleSaveName = async () => {
    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from('fb_contacts')
        .update({ name: editedName.trim() || null })
        .eq('id', contact.id);
      
      if (error) throw error;
      
      // Update local state immediately
      setContactMeta(prev => prev ? { ...prev, name: editedName.trim() || null } : null);
      setIsEditingName(false);
      toast.success('Name updated');
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error('Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const startEditingName = () => {
    setEditedName(effectiveName || '');
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contactMeta?.profile_pic_url || contact.profile_pic_url || undefined} />
            <AvatarFallback className="bg-blue-500 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-7 w-40 text-sm"
                    placeholder="Enter name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') cancelEditingName();
                    }}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={handleSaveName}
                    disabled={isSavingName}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={cancelEditingName}
                    disabled={isSavingName}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <h3 className="font-semibold">{displayName}</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={startEditingName}
                    title="Edit name"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              )}
              {!isEditingName && contact.needs_handoff && (
                <Badge variant="outline" className="text-warning border-warning text-xs">
                  <UserRound className="h-3 w-3 mr-1" />
                  Handoff
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                Messenger • {contact.facebook_pages?.page_name || 'Unknown Page'}
              </span>
              {contactLabels.slice(0, 3).map((label) => (
                <Badge
                  key={label.id}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4"
                  style={{ backgroundColor: label.color, color: 'white' }}
                >
                  {label.name}
                </Badge>
              ))}
              {contactLabels.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{contactLabels.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLabelsDialogOpen(true)}
            title="Manage Labels"
          >
            <Tag className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleDetails}
            title={showDetailsPanel ? "Hide customer details" : "Show customer details"}
          >
            {showDetailsPanel ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelRightOpen className="h-5 w-5" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <UserRound className="h-4 w-4 mr-2" />
                Request Handoff
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bot className="h-4 w-4 mr-2" />
                Resume AI
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Block Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef} onScrollCapture={handleScroll}>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
              >
                <Skeleton className="h-12 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(messagesByDate).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-muted px-3 py-1 rounded-full">
                    <span className="text-xs text-muted-foreground">
                      {formatDateSeparator(new Date(date))}
                    </span>
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-2">
                  {dateMessages.map((message, index) => {
                    const prevMessage = dateMessages[index - 1];
                    const showTimestamp = !prevMessage || 
                      new Date(message.sent_at).getTime() - new Date(prevMessage.sent_at).getTime() > 60000;

                    return (
                      <FBMessageBubble
                        key={message.id}
                        message={message}
                        showTimestamp={showTimestamp}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <FBTypingIndicator 
          typingAt={contact.typing_at} 
          contactName={effectiveName || 'Customer'} 
        />
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <FBChatInput
        onSend={handleSendMessage}
        disabled={sending || contact.is_blocked}
        placeholder={contact.is_blocked ? "Contact is blocked" : "Type a message..."}
        tenantId={contact.tenant_id}
      />

      {/* Labels Dialog */}
      <FBContactLabelsDialog
        open={labelsDialogOpen}
        onOpenChange={setLabelsDialogOpen}
        contactId={contact.id}
        contactName={contact.name || contact.psid}
      />
    </div>
  );
}
