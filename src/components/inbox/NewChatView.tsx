import { useState, useCallback } from 'react';
import { Phone, Send, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NewChatContact, useNewChat } from '@/hooks/useNewChat';
import { Contact } from '@/hooks/useContacts';

interface NewChatViewProps {
  newContact: NewChatContact;
  onContactCreated: (contact: Contact) => void;
  onBack?: () => void;
}

export default function NewChatView({ newContact, onContactCreated, onBack }: NewChatViewProps) {
  const [message, setMessage] = useState('');
  const { sending, sendFirstMessage } = useNewChat();

  const handleSend = useCallback(async () => {
    if (!message.trim() || !newContact.instance_id) return;

    const result = await sendFirstMessage(
      newContact.phone_number,
      newContact.instance_id,
      message.trim()
    );

    if (result.success && result.contact_id) {
      // Clear the message
      setMessage('');
      
      // Notify parent to switch to real contact view
      // We'll create a minimal Contact object for immediate switch
      // The real contact data will be fetched by useContacts
      onContactCreated({
        id: result.contact_id,
        phone_number: newContact.phone_number,
        name: null,
        wa_id: `${newContact.phone_number}@s.whatsapp.net`,
        tenant_id: '',
        instance_id: newContact.instance_id!,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        is_archived: false,
        is_blocked: false,
        needs_handoff: false,
        handoff_reason: null,
        handoff_at: null,
        profile_pic_url: null,
        assigned_to: null,
      });
    }
  }, [message, newContact, sendFirstMessage, onContactCreated]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Phone className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {newContact.phone_number}
          </h3>
          <p className="text-xs text-muted-foreground">
            নতুন চ্যাট শুরু করুন
          </p>
        </div>
      </div>

      {/* Empty chat area with prompt */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-brand/10 flex items-center justify-center mb-4">
          <MessageSquarePlus className="h-10 w-10 text-brand" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          নতুন চ্যাট
        </h2>
        <p className="text-muted-foreground max-w-sm">
          {newContact.phone_number} নম্বরে প্রথম মেসেজ পাঠান। 
          মেসেজ পাঠানোর পর এই নম্বরটি আপনার কন্টাক্ট লিস্টে যুক্ত হবে।
        </p>
      </div>

      {/* Message input */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="মেসেজ লিখুন..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending || !newContact.instance_id}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending || !newContact.instance_id}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        {!newContact.instance_id && (
          <p className="text-xs text-destructive mt-2">
            কোনো WhatsApp instance কানেক্টেড নেই
          </p>
        )}
      </div>
    </div>
  );
}
