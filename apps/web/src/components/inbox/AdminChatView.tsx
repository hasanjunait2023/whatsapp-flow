import { useEffect, useRef, useState, useCallback } from 'react';
import { AdminContact } from '@/hooks/useAdminContacts';
import { useAdminMessages, AdminMessage } from '@/hooks/useAdminMessages';
import { useForwardMessage } from '@/hooks/useForwardMessage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import MessageBubble from './MessageBubble';
import ChatInput, { MediaPayload } from './ChatInput';
import HandoffBanner from './HandoffBanner';
import SelectionToolbar from './SelectionToolbar';
import ForwardMessageDialog from './ForwardMessageDialog';
import AdminContactLabelsDialog from './AdminContactLabelsDialog';
import AdminAssignMemberDialog from './AdminAssignMemberDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  MoreVertical, 
  User, 
  Tag,
  MessageCircle,
  AlertCircle,
  UserRound,
  Trash2,
  Ban,
  Download,
  ShieldAlert,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdminChatViewProps {
  contact: AdminContact;
  instanceId: string;
  onMarkAsRead: (id: string) => void;
  onResolveHandoff?: (id: string) => void;
  onRequestHandoff?: (id: string, reason: string) => void;
  onDeleteContact?: (id: string) => void;
  allContacts?: AdminContact[];
}

export default function AdminChatView({ 
  contact, 
  instanceId,
  onMarkAsRead, 
  onResolveHandoff, 
  onRequestHandoff, 
  onDeleteContact,
  allContacts = [],
}: AdminChatViewProps) {
  const { messages, loading, sending, sendMessage, deleteMessage } = useAdminMessages(contact.id);
  const { toast } = useToast();
  const { forwardMessages, forwarding, progress: forwardProgress } = useForwardMessage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<AdminMessage | null>(null);
  
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<AdminMessage[]>([]);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  
  // Labels and assignment dialogs
  const [labelsDialogOpen, setLabelsDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [localAssignee, setLocalAssignee] = useState<string | null>(contact.assigned_to);

  // Update localAssignee when contact changes
  useEffect(() => {
    setLocalAssignee(contact.assigned_to);
  }, [contact.assigned_to]);

  const displayName = contact.name || contact.phone_number;
  const initials = displayName.slice(0, 2).toUpperCase();

  // Check if typing timestamp is recent (within last 10 seconds)
  const isRecentTyping = (typingAt: string | null | undefined): boolean => {
    if (!typingAt) return false;
    const typingTime = new Date(typingAt).getTime();
    const now = Date.now();
    return now - typingTime < 10000;
  };

  // Create a map of messages by ID for quick lookup of quoted messages
  const messagesById = messages.reduce((acc, msg) => {
    acc[msg.id] = msg;
    return acc;
  }, {} as Record<string, AdminMessage>);

  const handleResolveHandoff = () => {
    onResolveHandoff?.(contact.id);
    toast({
      title: 'Handoff resolved',
      description: 'You are now handling this conversation.',
    });
  };

  const handleResumeAI = () => {
    onResolveHandoff?.(contact.id);
    toast({
      title: 'AI resumed',
      description: 'AI will continue handling this conversation.',
    });
  };

  const handleRequestHandoff = () => {
    onRequestHandoff?.(contact.id, 'Manual handoff requested by agent');
    toast({
      title: 'Handoff requested',
      description: 'This conversation has been flagged for human assistance.',
    });
  };

  const handleReplyToMessage = useCallback((message: AdminMessage) => {
    setReplyingTo(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleQuotedClick = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
      }, 2000);
    }
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast({
        title: 'Message deleted',
        description: 'The message has been removed.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to delete message',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [deleteMessage, toast]);

  const handleDeleteContact = () => {
    onDeleteContact?.(contact.id);
  };

  // Selection mode handlers
  const handleSelectMessage = useCallback((message: AdminMessage, selected: boolean) => {
    if (selected) {
      setSelectedMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        if (prev.length >= 20) {
          toast({
            title: 'Selection limit',
            description: 'Maximum 20 messages can be selected at once',
            variant: 'destructive',
          });
          return prev;
        }
        return [...prev, message];
      });
      setSelectionMode(true);
    } else {
      setSelectedMessages((prev) => {
        const newSelection = prev.filter((m) => m.id !== message.id);
        if (newSelection.length === 0) {
          setSelectionMode(false);
        }
        return newSelection;
      });
    }
  }, [toast]);

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedMessages([]);
  }, []);

  const handleOpenForwardDialog = useCallback(() => {
    if (selectedMessages.length === 0) return;
    setForwardDialogOpen(true);
  }, [selectedMessages.length]);

  const handleForwardSingleMessage = useCallback((message: AdminMessage) => {
    setSelectedMessages([message]);
    setForwardDialogOpen(true);
  }, []);

  const handleForward = useCallback(async (targetContactId: string | null, phoneNumber?: string) => {
    if (!instanceId) {
      toast({
        title: 'No instance connected',
        description: 'Please connect a WhatsApp instance first.',
        variant: 'destructive',
      });
      return;
    }

    const result = await forwardMessages(
      selectedMessages as any,
      instanceId,
      targetContactId || undefined,
      phoneNumber
    );

    if (result.success) {
      toast({
        title: 'Messages forwarded',
        description: `${result.forwarded} message${result.forwarded > 1 ? 's' : ''} forwarded successfully`,
      });
      setForwardDialogOpen(false);
      handleCancelSelection();
    } else {
      toast({
        title: 'Forward failed',
        description: result.error || `${result.failed} message(s) failed to forward`,
        variant: 'destructive',
      });
    }
  }, [instanceId, selectedMessages, forwardMessages, toast, handleCancelSelection]);

  // Mark as read when viewing
  useEffect(() => {
    if (contact.unread_count > 0) {
      onMarkAsRead(contact.id);
    }
  }, [contact.id, contact.unread_count, onMarkAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Clear reply state and selection when switching contacts
  useEffect(() => {
    setReplyingTo(null);
    setSelectionMode(false);
    setSelectedMessages([]);
    setForwardDialogOpen(false);
  }, [contact.id]);

  const handleSendMessage = async (content: string, media?: MediaPayload) => {
    if (!instanceId) {
      toast({
        title: 'No instance connected',
        description: 'Please connect a WhatsApp instance first.',
        variant: 'destructive',
      });
      return;
    }

    // Silent send - no error toast, message stays pending for retry
    await sendMessage(instanceId, content, media?.content_type || 'text', media);
    setReplyingTo(null);
  };

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Group messages by date
  const messagesByDate = messages.reduce((acc, message) => {
    if (!message.sent_at) return acc;
    
    const sentDate = new Date(message.sent_at);
    if (isNaN(sentDate.getTime()) || sentDate.getFullYear() < 2000) return acc;
    
    const date = format(sentDate, 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(message);
    return acc;
  }, {} as Record<string, typeof messages>);

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Selection Toolbar */}
      <SelectionToolbar
        selectedCount={selectedMessages.length}
        onCancel={handleCancelSelection}
        onForward={handleOpenForwardDialog}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3 pl-10 md:pl-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contact.profile_pic_url || ''} />
            <AvatarFallback className="bg-brand/10 text-brand font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{displayName}</h3>
            <p className="text-xs text-muted-foreground">{contact.phone_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => setAssignDialogOpen(true)}
              >
                <User className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Assign to team member</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => setLabelsDialogOpen(true)}
              >
                <Tag className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manage labels</TooltipContent>
          </Tooltip>
          {!contact.needs_handoff && onRequestHandoff && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={handleRequestHandoff}
                >
                  <UserRound className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Request human handoff</TooltipContent>
            </Tooltip>
          )}
          {onDeleteContact && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete contact & chat</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this contact and all their messages? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteContact}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => {
                  toast({
                    title: 'Contact blocked',
                    description: `${displayName} has been blocked.`,
                  });
                }}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="h-4 w-4 mr-2" />
                Block contact
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  toast({
                    title: 'Export started',
                    description: 'Chat history is being exported...',
                  });
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  toast({
                    title: 'Marked as spam',
                    description: `${displayName} has been marked as spam.`,
                  });
                }}
                className="text-warning focus:text-warning"
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                Mark as spam
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Handoff Banner */}
      <HandoffBanner 
        contact={contact as any} 
        onResolve={handleResolveHandoff}
        onResumeAI={handleResumeAI}
      />

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className="h-16 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-brand" />
              </div>
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Start the conversation by sending a message below.
              </p>
            </div>
          )}

          {!loading &&
            Object.entries(messagesByDate).map(([date, dayMessages]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {formatDateSeparator(new Date(date))}
                  </span>
                </div>
                <div className="space-y-2">
                  {dayMessages.map((message) => (
                    <div key={message.id} id={`message-${message.id}`} className="transition-all duration-300">
                      <MessageBubble
                        message={message as any}
                        quotedMessage={message.reply_to_id ? messagesById[message.reply_to_id] as any : null}
                        onReply={handleReplyToMessage as any}
                        onQuotedClick={handleQuotedClick}
                        onDelete={handleDeleteMessage}
                        canDelete={true}
                        selectionMode={selectionMode}
                        isSelected={selectedMessages.some((m) => m.id === message.id)}
                        onSelect={handleSelectMessage as any}
                        onForward={handleForwardSingleMessage as any}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {/* Device Typing Indicator */}
          {contact.device_typing_at && isRecentTyping(contact.device_typing_at) && (
            <div className="flex items-center gap-2 px-2 py-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={contact.profile_pic_url || undefined} />
                <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl px-3 py-2 flex items-center gap-1">
                <span className="text-xs text-muted-foreground">typing</span>
                <div className="flex gap-0.5">
                  <span className="animate-bounce text-muted-foreground" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce text-muted-foreground" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce text-muted-foreground" style={{ animationDelay: '300ms' }}>.</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* No Instance Warning */}
      {!instanceId && (
        <div className="px-4 py-2 bg-warning/10 border-t border-warning/20">
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">No WhatsApp instance connected. Messages won't be sent.</p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={!instanceId}
        sending={sending}
        replyingTo={replyingTo as any}
        onCancelReply={handleCancelReply}
      />

      {/* Forward Message Dialog */}
      <ForwardMessageDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        messages={selectedMessages as any}
        contacts={allContacts.filter(c => c.id !== contact.id) as any}
        onForward={handleForward}
        forwarding={forwarding}
        progress={forwardProgress}
      />

      {/* Contact Labels Dialog */}
      <AdminContactLabelsDialog
        open={labelsDialogOpen}
        onOpenChange={setLabelsDialogOpen}
        contactId={contact.id}
        contactName={displayName}
        tenantId={contact.tenant_id}
      />

      {/* Assign Member Dialog */}
      <AdminAssignMemberDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        contactId={contact.id}
        contactName={displayName}
        currentAssignee={localAssignee}
        onAssigned={(userId) => setLocalAssignee(userId)}
      />
    </div>
  );
}
