import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FBMessage } from './useFBMessages';

export interface SendMessageInput {
  contact_id: string;
  content: string;
  content_type?: 'text' | 'image' | 'video' | 'audio' | 'file';
  media_url?: string;
  attachment_id?: string;
  quick_replies?: Array<{
    title: string;
    payload?: string;
    image_url?: string;
  }>;
}

export interface OptimisticCallbacks {
  onOptimisticAdd: (message: FBMessage) => void;
  onOptimisticUpdate: (optimisticId: string, realId: string, status: 'sent' | 'failed', errorMessage?: string) => void;
}

export function useFBSendMessage() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(async (
    input: SendMessageInput,
    callbacks?: OptimisticCallbacks
  ) => {
    setSending(true);
    setError(null);

    // Create optimistic message for instant UI feedback
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: FBMessage = {
      id: optimisticId,
      tenant_id: '',
      page_id: '',
      contact_id: input.contact_id,
      mid: null,
      direction: 'outbound',
      status: 'pending',
      content_type: input.content_type || 'text',
      content: input.content || null,
      media_url: input.media_url || null,
      original_media_url: null,
      attachment_id: input.attachment_id || null,
      media_mime_type: null,
      media_filename: null,
      quick_reply_payload: null,
      reply_to_id: null,
      is_from_ai: false,
      sent_by_user_id: null,
      error_message: null,
      retry_count: 0,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    // Add optimistic message immediately for instant feedback
    callbacks?.onOptimisticAdd(optimisticMessage);

    try {
      const response = await supabase.functions.invoke('fb-send-message', {
        body: input,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send message');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Update optimistic message with real ID
      if (response.data?.message_id) {
        callbacks?.onOptimisticUpdate(optimisticId, response.data.message_id, 'sent');
      }

      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);
      
      // Mark optimistic message as failed
      callbacks?.onOptimisticUpdate(optimisticId, optimisticId, 'failed', error.message);
      
      throw error;
    } finally {
      setSending(false);
    }
  }, []);

  return {
    sendMessage,
    sending,
    error,
  };
}
