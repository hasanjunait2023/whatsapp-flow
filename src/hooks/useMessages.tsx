import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { MediaPayload } from '@/components/inbox/ChatInput';

export interface Message {
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
  // Team member who sent the message
  sent_by_user_id?: string | null;
  sender_name?: string | null;
}

export function useMessages(contactId: string | null) {
  const { currentTenant } = useTenant();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);
  
  // Track initial load vs background refresh to prevent UI flicker
  const hasInitialLoadRef = useRef(false);
  
  // Use ref to track messages without causing re-renders in effect
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // Track recently sent message IDs to prevent duplicates from real-time events
  const sentMessageIdsRef = useRef<Set<string>>(new Set());
  
  // Cache for sender profile names to avoid N+1 queries in real-time handler
  const profileCacheRef = useRef<Map<string, string | null>>(new Map());

  // Silent fetch for background refresh (doesn't trigger loading state)
  const fetchMessagesSilent = useCallback(async () => {
    if (!currentTenant || !contactId) return;

    try {
      const { data: messagesData, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('sent_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Get unique sender user IDs to fetch their names
      const senderIds = [...new Set(
        (messagesData || [])
          .filter(m => m.sent_by_user_id)
          .map(m => m.sent_by_user_id)
      )];

      // Fetch profile names if there are any senders
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

      // Map sender names to messages
      const messagesWithSender = (messagesData || []).map((msg: any) => ({
        ...msg,
        sender_name: msg.sent_by_user_id ? profilesMap[msg.sent_by_user_id] || null : null,
      }));

      setMessages(messagesWithSender as Message[]);
    } catch (err) {
      console.error('Silent fetch error:', err);
    }
  }, [currentTenant?.id, contactId]);

  const fetchMessages = useCallback(async () => {
    if (!currentTenant || !contactId) return;

    // Only show loading on initial load, not background refresh
    const isInitialLoad = !hasInitialLoadRef.current;
    
    try {
      if (isInitialLoad) {
        setLoading(true);
      }

      const { data: messagesData, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('sent_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Get unique sender user IDs to fetch their names
      const senderIds = [...new Set(
        (messagesData || [])
          .filter(m => m.sent_by_user_id)
          .map(m => m.sent_by_user_id)
      )];

      // Fetch profile names if there are any senders
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

      // Map sender names to messages
      const messagesWithSender = (messagesData || []).map((msg: any) => ({
        ...msg,
        sender_name: msg.sent_by_user_id ? profilesMap[msg.sent_by_user_id] || null : null,
      }));

      setMessages(messagesWithSender as Message[]);
      hasInitialLoadRef.current = true;
    } catch (err) {
      setError(err as Error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [currentTenant?.id, contactId]);

  // Auto-retry kicker for stuck pending messages - uses ref to avoid dependency issues
  useEffect(() => {
    if (!currentTenant || !contactId) return;

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
            body: { process_pending: true, tenant_id: currentTenant.id }
          });
        } catch (err) {
          console.error('Error triggering pending retry:', err);
        } finally {
          isProcessing = false;
        }
      }
    };

    // Check every 30 seconds (reduced from 10s to lower CPU usage)
    pendingRetryInterval = setInterval(checkAndRetryPending, 30000);

    return () => {
      if (pendingRetryInterval) clearInterval(pendingRetryInterval);
    };
  }, [currentTenant?.id, contactId]); // Only depend on tenant/contact, use ref for messages

  // Status polling fallback - catches missed real-time updates for read/delivered status
  // Uses silent fetch to prevent UI flicker
  useEffect(() => {
    if (!currentTenant || !contactId) return;
    
    // Poll for status updates every 60 seconds as fallback (reduced from 15s to lower CPU usage)
    const statusPollInterval = setInterval(() => {
      fetchMessagesSilent();
    }, 60000);
    
    return () => clearInterval(statusPollInterval);
  }, [currentTenant?.id, contactId, fetchMessagesSilent]);

  // Reset initial load tracking when contact changes
  useEffect(() => {
    hasInitialLoadRef.current = false;
    sentMessageIdsRef.current.clear();
    profileCacheRef.current.clear();
    setMessages([]);
    setLoading(true);
  }, [contactId]);

  useEffect(() => {
    if (currentTenant && contactId) {
      fetchMessages();

      let channel: ReturnType<typeof supabase.channel> | null = null;
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
      let fallbackInterval: ReturnType<typeof setInterval> | null = null;

      const setupSubscription = () => {
        // Subscribe to real-time updates for this contact's messages
        channel = supabase
          .channel(`messages-${contactId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `contact_id=eq.${contactId}`,
            },
            async (payload) => {
              console.log('New message received:', payload.new);
              const newMessage = payload.new as Message;
              
              // Fetch sender name if sent_by_user_id exists and it's an outbound message
              // Uses cache to avoid N+1 queries
              let senderName: string | null = null;
              if (newMessage.sent_by_user_id && newMessage.direction === 'outbound') {
                // Check cache first
                if (profileCacheRef.current.has(newMessage.sent_by_user_id)) {
                  senderName = profileCacheRef.current.get(newMessage.sent_by_user_id) || null;
                } else {
                  // Only fetch if not cached
                  try {
                    const { data: profile } = await supabase
                      .from('profiles')
                      .select('full_name')
                      .eq('id', newMessage.sent_by_user_id)
                      .maybeSingle();
                    senderName = profile?.full_name || null;
                    profileCacheRef.current.set(newMessage.sent_by_user_id, senderName);
                  } catch (err) {
                    console.error('Error fetching sender profile:', err);
                  }
                }
              }
              
              const messageWithSender = { ...newMessage, sender_name: senderName };
              
              setMessages((prev) => {
                // Check if already exists by ID
                const existsById = prev.find(m => m.id === messageWithSender.id);
                if (existsById) {
                  // Update existing message with server data, preserve sender_name if already set
                  return prev.map(m => m.id === messageWithSender.id 
                    ? { ...messageWithSender, sender_name: messageWithSender.sender_name || m.sender_name } 
                    : m);
                }
                
                // Check by wa_message_id first (most reliable dedup)
                if (messageWithSender.wa_message_id) {
                  const existsByWaId = prev.find(m => m.wa_message_id === messageWithSender.wa_message_id);
                  if (existsByWaId) {
                    return prev.map(m => m.wa_message_id === messageWithSender.wa_message_id 
                      ? { ...messageWithSender, sender_name: messageWithSender.sender_name || m.sender_name }
                      : m);
                  }
                }
                
                // For outbound messages, check if we already have this message
                // (prevents duplicates from optimistic update + realtime race condition)
                if (messageWithSender.direction === 'outbound') {
                  // Check if we just sent this message (tracked in sentMessageIdsRef)
                  if (sentMessageIdsRef.current.has(messageWithSender.id)) {
                    // Find the specific optimistic message that matches content and replace it
                    const optimisticMatch = prev.find(m => 
                      m.id.startsWith('optimistic-') && 
                      m.status === 'pending' &&
                      m.content === messageWithSender.content
                    );
                    
                    if (optimisticMatch) {
                      return prev.map(m => 
                        m.id === optimisticMatch.id
                          ? { ...messageWithSender, sender_name: messageWithSender.sender_name || m.sender_name }
                          : m
                      );
                    }
                    // Already processed, skip
                    return prev;
                  }

                  // Check for pending optimistic message with matching content
                  const optimisticIndex = prev.findIndex(m => 
                    m.id.startsWith('optimistic-') && 
                    m.status === 'pending' &&
                    m.direction === 'outbound' &&
                    m.contact_id === messageWithSender.contact_id &&
                    m.content === messageWithSender.content
                  );
                  
                  if (optimisticIndex !== -1) {
                    // Replace optimistic message with real one
                    const updated = [...prev];
                    updated[optimisticIndex] = messageWithSender;
                    return updated;
                  }
                }
                
                // For inbound messages or truly new messages, just append
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
              console.log('Message status updated:', payload.new.id, 'new status:', (payload.new as any).status);
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id === payload.new.id) {
                    // Preserve computed fields (sender_name) since they're not in the DB payload
                    return { 
                      ...(payload.new as Message), 
                      sender_name: m.sender_name 
                    };
                  }
                  return m;
                })
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
              console.log('Message deleted:', payload.old);
              setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
            }
          )
          .subscribe((status, err) => {
            console.log('Messages subscription status:', status, err);
            
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('Realtime subscription error, will retry...');
              // Cleanup and retry after a delay
              if (channel) {
                supabase.removeChannel(channel);
                channel = null;
              }
              reconnectTimeout = setTimeout(() => {
                console.log('Attempting realtime reconnection...');
                setupSubscription();
              }, 3000);
              
              // Start fallback polling when realtime fails (15s interval, reduced from 5s)
              if (!fallbackInterval) {
                fallbackInterval = setInterval(() => {
                  console.log('Fallback polling for messages...');
                  fetchMessagesSilent();
                }, 15000);
              }
            } else if (status === 'SUBSCRIBED') {
              // Clear fallback polling when realtime is working
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
  }, [currentTenant?.id, contactId, fetchMessages]);

  const sendMessage = useCallback(async (
    instanceId: string,
    content: string,
    contentType: string = 'text',
    media?: MediaPayload
  ) => {
    if (!currentTenant || !contactId) throw new Error('No tenant or contact selected');

    setSending(true);

    // Create optimistic message for instant UI feedback
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      tenant_id: currentTenant.id,
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

    // Add optimistic message immediately
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      // Build request body
      const body: any = {
        contact_id: contactId,
        instance_id: instanceId,
        content,
        content_type: media?.content_type || contentType,
      };

      // Add media fields if present
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

      // Call the send-message edge function
      const { data, error: invokeError } = await supabase.functions.invoke('send-message', {
        body,
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to send message');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send message');
      }

      // Track the real message ID to prevent duplicate from real-time event
      if (data.message_id) {
        sentMessageIdsRef.current.add(data.message_id);
        // Clear from tracking after 10 seconds
        setTimeout(() => {
          sentMessageIdsRef.current.delete(data.message_id);
        }, 10000);

        // Replace optimistic message with real message ID
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId
              ? { ...m, id: data.message_id, status: 'sent' as const }
              : m
          )
        );
      }

      // last_message_at is now auto-updated by database trigger
      return data;
    } catch (err) {
      // Silent failure - keep message as pending for backend retry
      // Don't mark as failed, don't throw error
      console.error('Message send error (will retry):', err);
      return { success: false, error: (err as Error).message };
    } finally {
      setSending(false);
    }
  }, [currentTenant?.id, contactId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) throw deleteError;

    // Remove from local state immediately
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
