import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerJourneyEvent {
  id: string;
  entity_type: 'lead' | 'tenant';
  entity_id: string;
  event_type: string;
  event_category: 'marketing' | 'engagement' | 'conversion' | 'support' | 'payment' | null;
  title_bn: string;
  description_bn: string | null;
  channel: 'whatsapp' | 'email' | 'in_app' | 'system' | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CustomerJourneyEventInput {
  entity_type: 'lead' | 'tenant';
  entity_id: string;
  event_type: string;
  event_category?: CustomerJourneyEvent['event_category'];
  title_bn: string;
  description_bn?: string;
  channel?: CustomerJourneyEvent['channel'];
  metadata?: Record<string, unknown>;
}

export function useAdminCustomerJourney(entityType?: 'lead' | 'tenant', entityId?: string) {
  const [events, setEvents] = useState<CustomerJourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('admin_customer_journey')
        .select('*')
        .order('created_at', { ascending: false });

      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId);
      }

      const { data, error: fetchError } = await query.limit(100);

      if (fetchError) throw fetchError;

      setEvents(
        (data || []).map((e: any) => ({
          ...e,
          metadata: e.metadata || {},
        }))
      );
      setError(null);
    } catch (err) {
      console.error('Error fetching journey events:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch journey events'));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const logEvent = async (input: CustomerJourneyEventInput): Promise<CustomerJourneyEvent> => {
    const { data, error } = await supabase
      .from('admin_customer_journey')
      .insert({
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        event_type: input.event_type,
        event_category: input.event_category,
        title_bn: input.title_bn,
        description_bn: input.description_bn,
        channel: input.channel,
        metadata: input.metadata || {},
      } as any)
      .select()
      .single();

    if (error) throw error;
    await fetchEvents();
    return data as CustomerJourneyEvent;
  };

  const getEventsByCategory = (category: CustomerJourneyEvent['event_category']) => {
    return events.filter((e) => e.event_category === category);
  };

  const getEventsByChannel = (channel: CustomerJourneyEvent['channel']) => {
    return events.filter((e) => e.channel === channel);
  };

  const getRecentEvents = (limit: number = 10) => {
    return events.slice(0, limit);
  };

  const getTimelineForEntity = (entityType: 'lead' | 'tenant', entityId: string) => {
    return events.filter((e) => e.entity_type === entityType && e.entity_id === entityId);
  };

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    logEvent,
    getEventsByCategory,
    getEventsByChannel,
    getRecentEvents,
    getTimelineForEntity,
  };
}
