import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MediaPayload } from '@/components/inbox/ChatInput';

// System tenant ID for admin business
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

export interface AdminMessage {
  id: string;
  tenant_id: string;
  instance_id: string;
  contact_id: string;
  wa_message_id: string | null;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  content_type: string;
  content: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_filename?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  reply_to_id: string | null;
  is_from_ai: boolean;
  error_message: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  sent_by_user_id?: string | null;
  sender_name?: string | null;
}

export function useAdminMessages(contactId: string | null) {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);
  
  // Use ref to track messages without causing re-renders in effect
  const messagesRef = useRef<AdminMessage[]>([]);
  messagesRef.current = messages;

  const fetchMessages = useCallback(async () => {
    if (!contactId) return;

    try {
      setLoading(true);

      const { data: messagesData, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('sent_at', { ascending: true });

      if (fetchError) throw fetchError;

      const senderIds = [...new Set(
        (messagesData || [])
          .filter(m => m.sent_by_user_id)
          .map(m => m.sent_by_user_id)
      )];

      let profilesMap: Record<string, string> = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds);

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || null;
          return acc;
        }, {} as Record<string, string>);
      }

      const messagesWithSender = (messagesData || []).map((msg: any) => ({
        ...msg,
        sender_name: msg.sent_by_user_id ? profilesMap[msg.sent_by_user_id] || null : null,
      }));

      setMessages(messagesWithSender as AdminMessage[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  // Auto-retry kicker for stuck pending messages - uses ref to avoid dependency issues
  useEffect(() => {
    if (!contactId) return;

    let pendingRetryInterval: ReturnType<typeof setInterval> | null = null;
    let isProcessing = false;

    const checkAndRetryPending = async () => {
      if (isProcessing) return;
      
      // Use ref to get current messages without dependency
      const currentMessages = messagesRef.current;
      
      // Find stuck pending outbound messages (older than 8 seconds)
      const stuckMessages = currentMessages.filter(m => 
        m.direction === 'outbound' && 
        m.status === 'pending' && 
        !m.id.startsWith('optimistic-') &&
        (Date.now() - new Date(m.sent_at).getTime()) > 8000
      );

      if (stuckMessages.length > 0) {
        isProcessing = true;
        console.log(`Found ${stuckMessages.length} stuck pending messages, triggering retry...`);
        
        try {
          await supabase.functions.invoke('send-message', {
            body: { process_pending: true, tenant_id: SYSTEM_TENANT_ID }
          });
        } catch (err) {
          console.error('Error triggering pending retry:', err);
        } finally {
          isProcessing = false;
        }
      }
    };

    // Check every 10 seconds (reduced frequency to avoid issues)
    pendingRetryInterval = setInterval(checkAndRetryPending, 10000);

    return () => {
      if (pendingRetryInterval) clearInterval(pendingRetryInterval);
    };
  }, [contactId]); // Only depend on contactId, use ref for messages

  useEffect(() => {
    if (contactId) {
      // IMMEDIATELY clear messages and set loading BEFORE fetch to prevent stale data
      setMessages([]);
      setLoading(true);
      fetchMessages();

      let channel: ReturnType<typeof supabase.channel> | null = null;
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
      let fallbackInterval: ReturnType<typeof setInterval> | null = null;

      const setupSubscription = () => {
        channel = supabase
          .channel(`admin-messages-${contactId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `contact_id=eq.${contactId}`,
            },
            async (payload) => {
              const newMessage = payload.new as AdminMessage;
              
              // Fetch sender name if sent_by_user_id exists and it's an outbound message
              let senderName: string | null = null;
              if (newMessage.sent_by_user_id && newMessage.direction === 'outbound') {
                try {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', newMessage.sent_by_user_id)
                    .maybeSingle();
                  senderName = profile?.full_name || null;
                } catch (err) {
                  console.error('Error fetching sender profile:', err);
                }
              }
              
              const messageWithSender = { ...newMessage, sender_name: senderName };
              
              setMessages((prev) => {
                const existsById = prev.find(m => m.id === messageWithSender.id);
                if (existsById) {
                  return prev.map(m => m.id === messageWithSender.id 
                    ? { ...messageWithSender, sender_name: messageWithSender.sender_name || m.sender_name }
                    : m);
                }
                
                if (messageWithSender.direction === 'outbound') {
                  const optimisticIndex = prev.findIndex(m => 
                    m.id.startsWith('optimistic-') && 
                    m.status === 'pending' &&
                    m.direction === 'outbound' &&
                    m.contact_id === messageWithSender.contact_id
                  );
                  
                  if (optimisticIndex !== -1) {
                    const updated = [...prev];
                    updated[optimisticIndex] = messageWithSender;
                    return updated;
                  }
                }
                
                if (messageWithSender.wa_message_id) {
                  const existsByWaId = prev.find(m => m.wa_message_id === messageWithSender.wa_message_id);
                  if (existsByWaId) {
                    return prev.map(m => m.wa_message_id === messageWithSender.wa_message_id 
                      ? { ...messageWithSender, sender_name: messageWithSender.sender_name || m.sender_name }
                      : m);
                  }
                }
                
                return [...prev, messageWithSender];
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
              filter: `contact_id=eq.${contactId}`,
            },
            (payload) => {
              setMessages((prev) =>
                prev.map((m) => (m.id === payload.new.id ? (payload.new as AdminMessage) : m))
              );
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'messages',
              filter: `contact_id=eq.${contactId}`,
            },
            (payload) => {
              setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
            }
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              if (channel) {
                supabase.removeChannel(channel);
                channel = null;
              }
              reconnectTimeout = setTimeout(() => {
                setupSubscription();
              }, 3000);
              
              if (!fallbackInterval) {
                fallbackInterval = setInterval(() => {
                  fetchMessages();
                }, 5000);
              }
            } else if (status === 'SUBSCRIBED') {
              if (fallbackInterval) {
                clearInterval(fallbackInterval);
                fallbackInterval = null;
              }
            }
          });
      };

      setupSubscription();

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
        }
      };
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [contactId, fetchMessages]);

  const sendMessage = useCallback(async (
    instanceId: string,
    content: string,
    contentType: string = 'text',
    media?: MediaPayload
  ) => {
    if (!contactId) throw new Error('No contact selected');

    setSending(true);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: AdminMessage = {
      id: optimisticId,
      tenant_id: SYSTEM_TENANT_ID,
      instance_id: instanceId,
      contact_id: contactId,
      wa_message_id: null,
      direction: 'outbound',
      status: 'pending',
      content_type: media?.content_type || contentType,
      content: content || null,
      media_url: media?.media_url || null,
      media_mime_type: null,
      media_filename: media?.media_filename || null,
      location_lat: media?.location_lat || null,
      location_lng: media?.location_lng || null,
      reply_to_id: media?.reply_to_id || null,
      is_from_ai: false,
      error_message: null,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const body: any = {
        contact_id: contactId,
        instance_id: instanceId,
        content,
        content_type: media?.content_type || contentType,
      };

      if (media?.media_url) {
        body.media_url = media.media_url;
      }
      if (media?.media_filename) {
        body.media_filename = media.media_filename;
      }
      if (media?.location_lat !== undefined) {
        body.location_lat = media.location_lat;
      }
      if (media?.location_lng !== undefined) {
        body.location_lng = media.location_lng;
      }
      if (media?.reply_to_id) {
        body.reply_to_id = media.reply_to_id;
      }

      const { data, error: invokeError } = await supabase.functions.invoke('send-message', {
        body,
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to send message');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send message');
      }

      if (data.message_id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId
              ? { ...m, id: data.message_id, status: 'sent' as const }
              : m
          )
        );
      }

      return data;
    } catch (err) {
      // Silent failure - keep message as pending for backend retry
      // Don't mark as failed, don't throw error
      console.error('Message send error (will retry):', err);
      return { success: false, error: (err as Error).message };
    } finally {
      setSending(false);
    }
  }, [contactId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) throw deleteError;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    deleteMessage,
    refetch: fetchMessages,
  };
}
