import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SendMessageResult {
  success: boolean;
  message_id?: string;
  wa_message_id?: string;
  error?: string;
  code?: string;
  current?: number;
  max?: number;
  upgrade_required?: boolean;
}

export function useSendMessage() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    contactId: string,
    content: string,
    instanceId?: string,
    contentType: string = 'text'
  ): Promise<SendMessageResult> => {
    setSending(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-message', {
        body: {
          contact_id: contactId,
          content,
          instance_id: instanceId,
          content_type: contentType,
        },
      });

      if (invokeError) {
        const errMsg = invokeError.message || 'Failed to send message';
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      if (!data?.success) {
        const errMsg = data?.error || 'Unknown error';
        const code = data?.code;
        setError(errMsg);
        
        // Return additional info for limit errors
        if (code === 'MESSAGE_LIMIT_REACHED') {
          return { 
            success: false, 
            error: errMsg, 
            code,
            current: data?.current,
            max: data?.max,
            upgrade_required: data?.upgrade_required
          };
        }
        
        return { success: false, error: errMsg };
      }

      return {
        success: true,
        message_id: data.message_id,
        wa_message_id: data.wa_message_id,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setSending(false);
    }
  }, []);

  const processPendingMessages = useCallback(async (tenantId: string): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    error?: string;
  }> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-message', {
        body: {
          process_pending: true,
          tenant_id: tenantId,
        },
      });

      if (invokeError) {
        return { success: false, processed: 0, failed: 0, error: invokeError.message };
      }

      return {
        success: data?.success || false,
        processed: data?.processed || 0,
        failed: data?.failed || 0,
        error: data?.error,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error';
      return { success: false, processed: 0, failed: 0, error: errMsg };
    }
  }, []);

  return {
    sendMessage,
    processPendingMessages,
    sending,
    error,
  };
}
