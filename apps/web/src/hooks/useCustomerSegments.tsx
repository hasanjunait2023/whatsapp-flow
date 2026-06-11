import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface SegmentRule {
  field: string;
  operator: string;
  value: number | string;
}

export interface CustomerSegment {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  rules: SegmentRule[];
  is_auto: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  contact_count?: number;
}

export interface CustomerScore {
  id: string;
  contact_id: string;
  tenant_id: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  last_order_date: string | null;
  first_order_date: string | null;
  message_count: number;
  score: number;
  score_tier: string;
  last_calculated_at: string;
}

export interface ScoringRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  criteria_type: string;
  operator: string;
  value_min: number | null;
  value_max: number | null;
  points: number;
  is_active: boolean;
  created_at: string;
}

export function useCustomerSegments() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  // Fetch segments with contact counts
  const { data: segments = [], isLoading: segmentsLoading } = useQuery({
    queryKey: ['customer-segments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get contact counts for each segment
      const segmentsWithCounts = await Promise.all(
        (data || []).map(async (segment) => {
          const { count } = await supabase
            .from('contact_segments')
            .select('*', { count: 'exact', head: true })
            .eq('segment_id', segment.id);

          return {
            ...segment,
            rules: (segment.rules as unknown as SegmentRule[]) || [],
            contact_count: count || 0,
          } as CustomerSegment;
        })
      );

      return segmentsWithCounts;
    },
    enabled: !!tenantId,
  });

  // Fetch scoring rules
  const { data: scoringRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['customer-scoring-rules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('customer_scoring_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ScoringRule[];
    },
    enabled: !!tenantId,
  });

  // Fetch customer scores
  const { data: customerScores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['customer-scores', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('customer_scores')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('score', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as CustomerScore[];
    },
    enabled: !!tenantId,
  });

  // Create segment
  const createSegment = useMutation({
    mutationFn: async (data: Omit<CustomerSegment, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'contact_count'>) => {
      if (!tenantId) throw new Error('No tenant');

      const { data: result, error } = await supabase
        .from('customer_segments')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          rules: data.rules as unknown as Json,
          is_auto: data.is_auto,
          is_active: data.is_active,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments', tenantId] });
      toast({ title: 'Segment created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create segment', description: error.message, variant: 'destructive' });
    },
  });

  // Update segment
  const updateSegment = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CustomerSegment> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('customer_segments')
        .update({
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          rules: data.rules as unknown as Json,
          is_auto: data.is_auto,
          is_active: data.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments', tenantId] });
      toast({ title: 'Segment updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update segment', description: error.message, variant: 'destructive' });
    },
  });

  // Delete segment
  const deleteSegment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_segments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments', tenantId] });
      toast({ title: 'Segment deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete segment', description: error.message, variant: 'destructive' });
    },
  });

  // Add contact to segment
  const addContactToSegment = useMutation({
    mutationFn: async ({ contactId, segmentId }: { contactId: string; segmentId: string }) => {
      const { error } = await supabase
        .from('contact_segments')
        .insert({
          contact_id: contactId,
          segment_id: segmentId,
          assignment_reason: 'manual',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments', tenantId] });
      toast({ title: 'Contact added to segment' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add contact', description: error.message, variant: 'destructive' });
    },
  });

  // Remove contact from segment
  const removeContactFromSegment = useMutation({
    mutationFn: async ({ contactId, segmentId }: { contactId: string; segmentId: string }) => {
      const { error } = await supabase
        .from('contact_segments')
        .delete()
        .eq('contact_id', contactId)
        .eq('segment_id', segmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments', tenantId] });
      toast({ title: 'Contact removed from segment' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove contact', description: error.message, variant: 'destructive' });
    },
  });

  // Create scoring rule
  const createScoringRule = useMutation({
    mutationFn: async (data: Omit<ScoringRule, 'id' | 'tenant_id' | 'created_at'>) => {
      if (!tenantId) throw new Error('No tenant');

      const { data: result, error } = await supabase
        .from('customer_scoring_rules')
        .insert({
          tenant_id: tenantId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-scoring-rules', tenantId] });
      toast({ title: 'Scoring rule created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create rule', description: error.message, variant: 'destructive' });
    },
  });

  // Delete scoring rule
  const deleteScoringRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_scoring_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-scoring-rules', tenantId] });
      toast({ title: 'Scoring rule deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete rule', description: error.message, variant: 'destructive' });
    },
  });

  return {
    segments,
    scoringRules,
    customerScores,
    loading: segmentsLoading || rulesLoading || scoresLoading,
    createSegment,
    updateSegment,
    deleteSegment,
    addContactToSegment,
    removeContactFromSegment,
    createScoringRule,
    deleteScoringRule,
  };
}
