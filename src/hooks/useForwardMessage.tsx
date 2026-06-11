import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/hooks/useMessages';

interface ForwardResult {
  success: boolean;
  forwarded: number;
  failed: number;
  contactId?: string;
  error?: string;
}

interface UseForwardMessageReturn {
  forwardMessages: (
    messages: Message[],
    instanceId: string,
    targetContactId?: string,
    targetPhoneNumber?: string
  ) => Promise<ForwardResult>;
  forwarding: boolean;
  progress: { current: number; total: number };
}

export function useForwardMessage(): UseForwardMessageReturn {
  const [forwarding, setForwarding] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const forwardMessages = useCallback(async (
    messages: Message[],
    instanceId: string,
    targetContactId?: string,
    targetPhoneNumber?: string
  ): Promise<ForwardResult> => {
    if (messages.length === 0) {
      return { success: false, forwarded: 0, failed: 0, error: 'No messages to forward' };
    }

    if (!targetContactId && !targetPhoneNumber) {
      return { success: false, forwarded: 0, failed: 0, error: 'No target specified' };
    }

    setForwarding(true);
    setProgress({ current: 0, total: messages.length });

    try {
      // Prepare messages for forwarding
      const messagesToForward = messages.map((msg) => {
        // Use type assertion for extended columns
        const msgAny = msg as any;
        return {
          content: msg.content,
          content_type: msg.content_type,
          media_url: msg.media_url,
          media_filename: msgAny.media_filename || null,
          location_lat: msgAny.location_lat || null,
          location_lng: msgAny.location_lng || null,
        };
      });

      const { data, error } = await supabase.functions.invoke('forward-message', {
        body: {
          messages: messagesToForward,
          instance_id: instanceId,
          target_contact_id: targetContactId,
          target_phone_number: targetPhoneNumber,
        },
      });

      if (error) {
        console.error('Forward message error:', error);
        return { 
          success: false, 
          forwarded: 0, 
          failed: messages.length, 
          error: error.message 
        };
      }

      setProgress({ current: messages.length, total: messages.length });

      return {
        success: data.success,
        forwarded: data.forwarded || 0,
        failed: data.failed || 0,
        contactId: data.contact_id,
        error: data.error,
      };
    } catch (err: any) {
      console.error('Forward message error:', err);
      return { 
        success: false, 
        forwarded: 0, 
        failed: messages.length, 
        error: err.message 
      };
    } finally {
      setForwarding(false);
      setProgress({ current: 0, total: 0 });
    }
  }, []);

  return {
    forwardMessages,
    forwarding,
    progress,
  };
}
