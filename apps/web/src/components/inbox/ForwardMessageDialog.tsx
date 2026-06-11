import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Contact } from '@/hooks/useContacts';
import { Message } from '@/hooks/useMessages';
import { Search, Send, Image, Video, FileText, Mic, MapPin, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  contacts: Contact[];
  onForward: (targetContactId: string | null, phoneNumber?: string) => Promise<void>;
  forwarding: boolean;
  progress: { current: number; total: number };
}

const getMessageTypeIcon = (type: string) => {
  switch (type) {
    case 'image':
      return <Image className="h-3 w-3" />;
    case 'video':
      return <Video className="h-3 w-3" />;
    case 'document':
      return <FileText className="h-3 w-3" />;
    case 'audio':
    case 'voice':
      return <Mic className="h-3 w-3" />;
    case 'location':
      return <MapPin className="h-3 w-3" />;
    default:
      return <MessageSquare className="h-3 w-3" />;
  }
};

const getMessageTypeSummary = (messages: Message[]) => {
  const types: Record<string, number> = {};
  messages.forEach((msg) => {
    const type = msg.content_type || 'text';
    types[type] = (types[type] || 0) + 1;
  });

  return Object.entries(types)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');
};

export default function ForwardMessageDialog({
  open,
  onOpenChange,
  messages,
  contacts,
  onForward,
  forwarding,
  progress,
}: ForwardMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('contacts');

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.phone_number.includes(query)
    );
  }, [contacts, searchQuery]);

  const handleForward = async () => {
    if (activeTab === 'contacts' && selectedContactId) {
      await onForward(selectedContactId);
    } else if (activeTab === 'number' && phoneNumber.trim()) {
      await onForward(null, phoneNumber.trim());
    }
    // Reset state after forwarding
    setSearchQuery('');
    setPhoneNumber('');
    setSelectedContactId(null);
  };

  const canForward =
    (activeTab === 'contacts' && selectedContactId) ||
    (activeTab === 'number' && phoneNumber.trim().length >= 10);

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Messages</DialogTitle>
        </DialogHeader>

        {/* Message Preview */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <div className="flex -space-x-1">
            {messages.slice(0, 3).map((msg, i) => (
              <div
                key={msg.id}
                className={cn(
                  'h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary',
                  i > 0 && 'border-2 border-background'
                )}
              >
                {getMessageTypeIcon(msg.content_type)}
              </div>
            ))}
            {messages.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs border-2 border-background">
                +{messages.length - 3}
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {messages.length} message{messages.length > 1 ? 's' : ''}: {getMessageTypeSummary(messages)}
          </span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contacts">Existing Contact</TabsTrigger>
            <TabsTrigger value="number">New Number</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[250px]">
              <div className="space-y-1">
                {filteredContacts.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No contacts found
                  </p>
                ) : (
                  filteredContacts.map((contact) => {
                    const displayName = contact.name || contact.phone_number;
                    const initials = displayName.slice(0, 2).toUpperCase();
                    const isSelected = selectedContactId === contact.id;

                    return (
                      <button
                        key={contact.id}
                        onClick={() => setSelectedContactId(contact.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left',
                          isSelected
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted'
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contact.profile_pic_url || ''} />
                          <AvatarFallback className="bg-brand/10 text-brand text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {contact.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {contact.phone_number}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="number" className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                type="tel"
                placeholder="+880 1712 345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the full phone number with country code
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Progress */}
        {forwarding && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Forwarding {progress.current}/{progress.total}...
              </span>
              <span className="font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} />
          </div>
        )}

        {/* Forward Button */}
        <Button
          onClick={handleForward}
          disabled={!canForward || forwarding}
          className="w-full"
        >
          {forwarding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Forwarding...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Forward {messages.length} Message{messages.length > 1 ? 's' : ''}
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
