import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FBMessage {
  id: string;
  tenant_id: string;
  page_id: string;
  contact_id: string;
  mid: string | null;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  content_type: string;
  content: string | null;
  media_url: string | null;
  original_media_url: string | null;
  attachment_id: string | null;
  media_mime_type: string | null;
  media_filename: string | null;
  quick_reply_payload: string | null;
  reply_to_id: string | null;
  is_from_ai: boolean;
  sent_by_user_id: string | null;
  error_message: string | null;
  retry_count: number;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  // Joined data
  reply_to?: FBMessage;
  sent_by?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useFBMessages(contactId: string | null) {
  const [messages, setMessages] = useState<FBMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!contactId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('fb_messages')
        .select(`
          *,
          reply_to:reply_to_id (
            id,
            content,
            content_type,
            direction,
            media_url
          )
        `)
        .eq('contact_id', contactId)
        .order('sent_at', { ascending: true })
        .limit(100);

      if (fetchError) throw fetchError;
      setMessages((data || []) as unknown as FBMessage[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching FB messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Track recently sent message IDs to prevent duplicates from real-time
  const recentlySentIdsRef = useRef<Set<string>>(new Set());

  // Real-time subscription
  useEffect(() => {
    if (!contactId) return;

    const channel = supabase
      .channel(`fb_messages_${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fb_messages',
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          const newMessage = payload.new as FBMessage;
          setMessages(prev => {
            // Check if already exists by ID (exact match)
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }

            // Check if this message was recently sent (tracked by our optimistic system)
            if (recentlySentIdsRef.current.has(newMessage.id)) {
              // Already handled by optimistic update, skip
              return prev;
            }
            
            // For outbound messages, check if we have a pending optimistic message to replace
            if (newMessage.direction === 'outbound') {
              // Find the OLDEST pending optimistic message with matching content
              const optimisticIndex = prev.findIndex(m => 
                m.id.startsWith('optimistic-') && 
                m.status === 'pending' &&
                m.direction === 'outbound' &&
                m.contact_id === newMessage.contact_id &&
                m.content === newMessage.content
              );
              
              if (optimisticIndex !== -1) {
                const updated = [...prev];
                updated[optimisticIndex] = newMessage;
                // Track this ID to prevent duplicates
                recentlySentIdsRef.current.add(newMessage.id);
                setTimeout(() => recentlySentIdsRef.current.delete(newMessage.id), 10000);
                return updated;
              }
            }
            
            // For inbound or unmatched outbound, append only if not duplicate
            // Double-check by mid (Facebook message ID) if available
            if (newMessage.mid && prev.some(m => m.mid === newMessage.mid)) {
              return prev;
            }
            
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fb_messages',
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as FBMessage;
          setMessages(prev =>
            prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId]);

  // Add optimistic message immediately
  const addOptimisticMessage = useCallback((message: FBMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Update optimistic message with real data or mark as failed
  const updateOptimisticMessage = useCallback((
    optimisticId: string, 
    realId: string, 
    status: 'sent' | 'failed',
    errorMessage?: string
  ) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === optimisticId
          ? { ...m, id: realId, status, error_message: errorMessage || null }
          : m
      )
    );
  }, []);

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
  };
}
