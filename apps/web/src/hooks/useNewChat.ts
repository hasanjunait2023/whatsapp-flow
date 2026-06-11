import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MediaPayload } from '@/components/inbox/ChatInput';

export interface NewChatContact {
  isNew: true;
  phone_number: string;
  instance_id: string | null;
}

export function isNewChatContact(contact: any): contact is NewChatContact {
  return contact && 'isNew' in contact && contact.isNew === true;
}

interface SendNewMessageResult {
  success: boolean;
  contact_id?: string;
  message_id?: string;
  wa_message_id?: string;
  error?: string;
}

export function useNewChat() {
  const [sending, setSending] = useState(false);

  const sendFirstMessage = useCallback(async (
    phoneNumber: string,
    instanceId: string,
    content: string,
    media?: MediaPayload
  ): Promise<SendNewMessageResult> => {
    if (!phoneNumber || !instanceId) {
      toast.error('Phone number and instance are required');
      return { success: false, error: 'Missing required fields' };
    }

    setSending(true);

    try {
      const payload = {
        phone_number: phoneNumber,
        instance_id: instanceId,
        content: content,
        content_type: media?.content_type || 'text',
        media_url: media?.media_url || null,
        media_filename: media?.media_filename || null,
      };

      const { data, error } = await supabase.functions.invoke('send-new-message', {
        body: payload,
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('মেসেজ পাঠাতে ব্যর্থ');
        return { success: false, error: error.message };
      }

      if (!data.success) {
        toast.error(data.error || 'মেসেজ পাঠাতে ব্যর্থ');
        return { 
          success: false, 
          error: data.error,
          contact_id: data.contact_id,
          message_id: data.message_id,
        };
      }

      toast.success('মেসেজ পাঠানো হয়েছে');
      return {
        success: true,
        contact_id: data.contact_id,
        message_id: data.message_id,
        wa_message_id: data.wa_message_id,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Send first message error:', err);
      toast.error('মেসেজ পাঠাতে সমস্যা হয়েছে');
      return { success: false, error: errorMessage };
    } finally {
      setSending(false);
    }
  }, []);

  return {
    sending,
    sendFirstMessage,
  };
}
