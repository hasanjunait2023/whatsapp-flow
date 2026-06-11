import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketingSequence {
  id: string;
  campaign_id: string;
  week_number: number;
  day_of_week: number | null;
  step_order: number;
  name: string;
  name_bn: string | null;
  theme: 'educational' | 'social_proof' | 'feature' | 'offer' | 'engagement' | 'welcome' | 'checkin' | null;
  channel: 'whatsapp' | 'email' | 'both';
  content_template: {
    subject_bn?: string;
    body_bn?: string;
    wa_message_bn?: string;
  };
  ai_personalize: boolean;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
}

export interface MarketingSequenceInput {
  campaign_id: string;
  week_number: number;
  day_of_week?: number;
  step_order: number;
  name: string;
  name_bn?: string;
  theme?: MarketingSequence['theme'];
  channel: MarketingSequence['channel'];
  content_template: MarketingSequence['content_template'];
  ai_personalize?: boolean;
  discount_percent?: number;
  is_active?: boolean;
}

export function useMarketingSequences(campaignId?: string) {
  const [sequences, setSequences] = useState<MarketingSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSequences = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('admin_marketing_sequences')
        .select('*')
        .order('week_number', { ascending: true })
        .order('step_order', { ascending: true });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setSequences(
        (data || []).map((s: any) => ({
          ...s,
          content_template: s.content_template || {},
        }))
      );
      setError(null);
    } catch (err) {
      console.error('Error fetching sequences:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch sequences'));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const createSequence = async (input: MarketingSequenceInput): Promise<MarketingSequence> => {
    const { data, error } = await supabase
      .from('admin_marketing_sequences')
      .insert({
        campaign_id: input.campaign_id,
        week_number: input.week_number,
        day_of_week: input.day_of_week,
        step_order: input.step_order,
        name: input.name,
        name_bn: input.name_bn,
        theme: input.theme,
        channel: input.channel,
        content_template: input.content_template,
        ai_personalize: input.ai_personalize ?? false,
        discount_percent: input.discount_percent ?? 0,
        is_active: input.is_active ?? true,
      } as any)
      .select()
      .single();

    if (error) throw error;
    await fetchSequences();
    return data as MarketingSequence;
  };

  const updateSequence = async (id: string, input: Partial<MarketingSequenceInput>) => {
    const { error } = await supabase
      .from('admin_marketing_sequences')
      .update(input as any)
      .eq('id', id);

    if (error) throw error;
    await fetchSequences();
  };

  const deleteSequence = async (id: string) => {
    const { error } = await supabase
      .from('admin_marketing_sequences')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchSequences();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await updateSequence(id, { is_active: isActive });
  };

  const getSequencesByWeek = (week: number) => {
    return sequences.filter((s) => s.week_number === week);
  };

  const getSequencesByTheme = (theme: MarketingSequence['theme']) => {
    return sequences.filter((s) => s.theme === theme);
  };

  return {
    sequences,
    loading,
    error,
    refetch: fetchSequences,
    createSequence,
    updateSequence,
    deleteSequence,
    toggleActive,
    getSequencesByWeek,
    getSequencesByTheme,
  };
}
