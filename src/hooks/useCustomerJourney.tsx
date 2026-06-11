import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface JourneyEvent {
  id: string;
  tenant_id: string;
  contact_id: string;
  event_type: string;
  event_category: string;
  title: string;
  description: string | null;
  metadata: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
}

export type EventCategory = 'communication' | 'order' | 'payment' | 'system' | 'custom';

// Customer Journey Events - Only customer-initiated milestones
// Team actions (product_shared, message_sent, note_added) are NOT tracked here
export const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  // Customer Communication Milestones
  first_contact: { icon: 'MessageCirclePlus', color: 'text-primary' },
  customer_returned: { icon: 'UserRoundCheck', color: 'text-blue-500' },
  complaint_raised: { icon: 'AlertTriangle', color: 'text-amber-500' },
  feedback_given: { icon: 'Star', color: 'text-yellow-500' },
  
  // Order Lifecycle
  order_created: { icon: 'ShoppingBag', color: 'text-violet-500' },
  order_confirmed: { icon: 'CheckCircle', color: 'text-blue-500' },
  order_processing: { icon: 'Package', color: 'text-purple-500' },
  order_shipped: { icon: 'Truck', color: 'text-cyan-500' },
  order_delivered: { icon: 'PackageCheck', color: 'text-green-500' },
  order_cancelled: { icon: 'PackageX', color: 'text-destructive' },
  
  // Payment
  payment_received: { icon: 'CreditCard', color: 'text-green-500' },
  
  // Support
  handoff_requested: { icon: 'UserRound', color: 'text-amber-500' },
  handoff_resolved: { icon: 'UserCheck', color: 'text-green-500' },
  
  // System
  behavior_check: { icon: 'TrendingUp', color: 'text-cyan-500' },
  
  // Group Events
  group_joined: { icon: 'UsersRound', color: 'text-green-500' },
  group_invite_sent: { icon: 'UserPlus', color: 'text-blue-500' },
  group_left: { icon: 'UserMinus', color: 'text-orange-500' },
};

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  communication: 'bg-blue-500/10',
  order: 'bg-violet-500/10',
  payment: 'bg-green-500/10',
  system: 'bg-amber-500/10',
  custom: 'bg-muted',
};

export function useCustomerJourney(contactId: string | null, explicitTenantId?: string) {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Use explicit tenantId if provided (for Admin Inbox), otherwise fall back to currentTenant
  const tenantId = explicitTenantId || currentTenant?.id;

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['customer-journey', tenantId, contactId],
    queryFn: async () => {
      if (!contactId || !tenantId) return [];

      const { data, error } = await supabase
        .from('customer_journey_events')
        .select('*')
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JourneyEvent[];
    },
    enabled: !!contactId && !!tenantId,
  });

  // Real-time subscription for journey events
  useEffect(() => {
    if (!contactId || !tenantId) return;

    const channel = supabase
      .channel(`journey-${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customer_journey_events',
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          console.log('New journey event:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['customer-journey', contactId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, tenantId, queryClient]);

  // Add a manual note/event
  const addNote = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      if (!contactId || !tenantId) throw new Error('No contact or tenant');

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('customer_journey_events')
        .insert({
          tenant_id: tenantId,
          contact_id: contactId,
          event_type: 'note_added',
          event_category: 'custom',
          title,
          description,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-journey', tenantId, contactId] });
      toast({ title: 'Note added to journey' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add note', description: error.message, variant: 'destructive' });
    },
  });

  // Add a customer journey event (complaint, feedback, etc.)
  const addEvent = async (eventType: string, title: string, description: string) => {
    if (!contactId || !tenantId) throw new Error('No contact or tenant');

    const { data: { user } } = await supabase.auth.getUser();

    // Determine category based on event type
    let category = 'communication';
    if (['complaint_raised', 'feedback_given', 'handoff_requested', 'handoff_resolved'].includes(eventType)) {
      category = 'support';
    } else if (eventType.startsWith('order_')) {
      category = 'order';
    } else if (eventType === 'payment_received') {
      category = 'payment';
    }

    const { error } = await supabase
      .from('customer_journey_events')
      .insert({
        tenant_id: tenantId,
        contact_id: contactId,
        event_type: eventType,
        event_category: category,
        title,
        description: description || null,
        created_by: user?.id || null,
      });

    if (error) {
      toast({ title: 'Failed to add event', description: error.message, variant: 'destructive' });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['customer-journey', tenantId, contactId] });
    toast({ title: 'Event added to journey' });
  };

  // Group events by date for display
  const eventsByDate = events.reduce((acc, event) => {
    const date = new Date(event.created_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, JourneyEvent[]>);

  return {
    events,
    eventsByDate,
    isLoading,
    error,
    addNote,
    addEvent,
  };
}
