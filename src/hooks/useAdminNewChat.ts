import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// System tenant ID for admin business
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

export interface AdminNewChatContact {
  isNew: true;
  phone_number: string;
  instance_id: string | null;
}

export function isAdminNewChatContact(contact: any): contact is AdminNewChatContact {
  return contact && 'isNew' in contact && contact.isNew === true;
}

interface SendNewMessageResult {
  success: boolean;
  contact_id?: string;
  message_id?: string;
  wa_message_id?: string;
  error?: string;
}

export function useAdminNewChat() {
  const [sending, setSending] = useState(false);

  const sendFirstMessage = useCallback(async (
    phoneNumber: string,
    instanceId: string,
    content: string
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
        content_type: 'text',
        media_url: null,
        media_filename: null,
      };

      const { data, error } = await supabase.functions.invoke('send-new-message', {
        body: payload,
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to send message');
        return { success: false, error: error.message };
      }

      if (!data.success) {
        toast.error(data.error || 'Failed to send message');
        return { 
          success: false, 
          error: data.error,
          contact_id: data.contact_id,
          message_id: data.message_id,
        };
      }

      toast.success('Message sent successfully');
      return {
        success: true,
        contact_id: data.contact_id,
        message_id: data.message_id,
        wa_message_id: data.wa_message_id,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Send first message error:', err);
      toast.error('Failed to send message');
      return { success: false, error: errorMessage };
    } finally {
      setSending(false);
    }
  }, []);

  return {
    sending,
    sendFirstMessage,
    systemTenantId: SYSTEM_TENANT_ID,
  };
}
