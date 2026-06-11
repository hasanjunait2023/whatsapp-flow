import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// System tenant ID for admin business
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

// Hidden phone numbers - won't show in admin inbox but data still saved in DB
const HIDDEN_PHONE_NUMBERS = [
  '+8801625363540',
  '8801625363540',
  '01625363540',
];

// Helper function to check if a phone number should be hidden
const isHiddenPhoneNumber = (phone: string | null): boolean => {
  if (!phone) return false;
  const normalized = phone.replace(/^\+/, '').replace(/\s/g, '');
  return HIDDEN_PHONE_NUMBERS.some(hidden => 
    normalized.includes(hidden.replace(/^\+/, '')) ||
    hidden.replace(/^\+/, '').includes(normalized)
  );
};

export interface AdminContact {
  id: string;
  tenant_id: string;
  instance_id: string;
  wa_id: string;
  phone_number: string;
  name: string | null;
  profile_pic_url: string | null;
  is_blocked: boolean;
  is_archived: boolean;
  assigned_to: string | null;
  last_message_at: string | null;
  unread_count: number;
  needs_handoff: boolean;
  handoff_reason: string | null;
  handoff_at: string | null;
  created_at: string;
  updated_at: string;
  last_message?: string;
  device_typing_at?: string | null;
}

export function useAdminContacts(instanceId: string | null = null) {
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const contactsChannelRef = useRef<RealtimeChannel | null>(null);
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);

      // In the central admin inbox we show threads for the selected WhatsApp instance,
      // not strictly for the System Tenant. This avoids "0 contacts" when contacts are
      // stored under their original tenant but routed through the admin's instance.
      if (!instanceId) {
        setContacts([]);
        return;
      }

      const { data: contactsData, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('instance_id', instanceId)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;

      const contactIds = (contactsData || []).map(c => c.id);
      
      if (contactIds.length > 0) {
        const { data: messagesData } = await supabase
          .from('messages')
          .select('contact_id, content, content_type, direction')
          .eq('instance_id', instanceId)
          .in('contact_id', contactIds)
          .order('sent_at', { ascending: false });

        const lastMessageMap: Record<string, string> = {};
        if (messagesData) {
          for (const msg of messagesData) {
            if (!lastMessageMap[msg.contact_id]) {
              let preview = '';
              if (msg.content_type === 'image') {
                preview = '📷 Photo';
              } else if (msg.content_type === 'video') {
                preview = '🎥 Video';
              } else if (msg.content_type === 'audio' || msg.content_type === 'ptt') {
                preview = '🎵 Voice message';
              } else if (msg.content_type === 'document') {
                preview = '📄 Document';
              } else if (msg.content_type === 'sticker') {
                preview = '🏷️ Sticker';
              } else if (msg.content_type === 'location') {
                preview = '📍 Location';
              } else {
                preview = msg.content || '';
              }
              
              if (msg.direction === 'outbound') {
                preview = `You: ${preview}`;
              }
              
              lastMessageMap[msg.contact_id] = preview;
            }
          }
        }

        const contactsWithMessages = (contactsData || [])
          .filter(contact => !isHiddenPhoneNumber(contact.phone_number))
          .map(contact => ({
            ...contact,
            last_message: lastMessageMap[contact.id] || null
          }));

        setContacts(contactsWithMessages);
      } else {
        setContacts([]);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Setup realtime subscriptions
  useEffect(() => {
    let isMounted = true;

    if (!instanceId) {
      // No instance selected yet; don't subscribe.
      return () => {
        isMounted = false;
      };
    }
    
    const setupContactsSubscription = () => {
      if (!isMounted) return;
      
      if (contactsChannelRef.current) {
        supabase.removeChannel(contactsChannelRef.current);
      }
      
      contactsChannelRef.current = supabase
        .channel(`admin-contacts-${instanceId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'contacts',
            filter: `instance_id=eq.${instanceId}`,
          },
          (payload) => {
            if (!isMounted) return;
            const newContact = payload.new as AdminContact;
            
            // Skip hidden phone numbers
            if (isHiddenPhoneNumber(newContact.phone_number)) return;
            
            setContacts((prev) => {
              if (prev.find(c => c.id === newContact.id)) return prev;
              return [newContact, ...prev];
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'contacts',
            filter: `instance_id=eq.${instanceId}`,
          },
          (payload) => {
            if (!isMounted) return;
            const updatedContact = payload.new as AdminContact;
            
            // Skip hidden phone numbers
            if (isHiddenPhoneNumber(updatedContact.phone_number)) return;
            
            setContacts((prev) => {
              const updated = prev.map((c) => 
                c.id === updatedContact.id ? { ...c, ...updatedContact } : c
              );
              return updated.sort((a, b) => {
                const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
                const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
                return bTime - aTime;
              });
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'contacts',
            filter: `instance_id=eq.${instanceId}`,
          },
          (payload) => {
            if (!isMounted) return;
            setContacts((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (contactsChannelRef.current) {
              supabase.removeChannel(contactsChannelRef.current);
              contactsChannelRef.current = null;
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              setupContactsSubscription();
            }, 3000);
            
            if (!fallbackIntervalRef.current && isMounted) {
              fallbackIntervalRef.current = setInterval(() => {
                if (isMounted) fetchContacts();
              }, 5000);
            }
          } else if (status === 'SUBSCRIBED') {
            if (fallbackIntervalRef.current) {
              clearInterval(fallbackIntervalRef.current);
              fallbackIntervalRef.current = null;
            }
          }
        });
    };
    
    const setupMessagesSubscription = () => {
      if (!isMounted) return;
      
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
      }
      
      messagesChannelRef.current = supabase
        .channel(`admin-inbox-messages-${instanceId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `instance_id=eq.${instanceId}`,
          },
          () => {
            if (!isMounted) return;
            fetchContacts();
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (messagesChannelRef.current) {
              supabase.removeChannel(messagesChannelRef.current);
              messagesChannelRef.current = null;
            }
            
            setTimeout(() => {
              setupMessagesSubscription();
            }, 3000);
          }
        });
    };

    setupContactsSubscription();
    setupMessagesSubscription();

    return () => {
      isMounted = false;
      
      if (contactsChannelRef.current) {
        supabase.removeChannel(contactsChannelRef.current);
      }
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, [fetchContacts, instanceId]);

  const updateContact = async (id: string, updates: Partial<AdminContact>) => {
    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase.rpc('mark_thread_as_read', {
      p_contact_id: id,
    });

    if (error) throw error;

    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
  };

  const requestHandoff = async (id: string, reason: string) => {
    const updates = {
      needs_handoff: true,
      handoff_reason: reason,
      handoff_at: new Date().toISOString(),
    };
    await updateContact(id, updates);
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const resolveHandoff = async (id: string) => {
    const updates = {
      needs_handoff: false,
      handoff_reason: null,
      handoff_at: null,
    };
    await updateContact(id, updates);
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteContact = async (id: string) => {
    await supabase.from('contact_labels').delete().eq('contact_id', id);
    await supabase.from('customer_journey_events').delete().eq('contact_id', id);
    await supabase.from('messages').delete().eq('contact_id', id);
    
    const { error: contactError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    
    if (contactError) throw contactError;
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    contacts,
    loading,
    error,
    refetch: fetchContacts,
    updateContact,
    markAsRead,
    requestHandoff,
    resolveHandoff,
    deleteContact,
    systemTenantId: SYSTEM_TENANT_ID,
  };
}
