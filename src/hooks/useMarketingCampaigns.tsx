import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketingCampaign {
  id: string;
  name: string;
  name_bn: string | null;
  type: 'prospect_nurture' | 'subscriber_retention' | 'pro_ai_onboard' | 'win_back' | 'announcement';
  status: 'draft' | 'active' | 'paused' | 'completed';
  target_tier: string[];
  target_audience: Record<string, unknown>;
  max_discount_percent: number;
  frequency_per_week: number;
  frequency_per_month: number;
  min_days_between_messages: number;
  use_whatsapp: boolean;
  use_email: boolean;
  alternate_channels: boolean;
  blackout_hours: { start: string; end: string };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaignInput {
  name: string;
  name_bn?: string;
  type: MarketingCampaign['type'];
  status?: MarketingCampaign['status'];
  target_tier?: string[];
  target_audience?: Record<string, unknown>;
  max_discount_percent?: number;
  frequency_per_week?: number;
  frequency_per_month?: number;
  min_days_between_messages?: number;
  use_whatsapp?: boolean;
  use_email?: boolean;
  alternate_channels?: boolean;
  blackout_hours?: { start: string; end: string };
}

export function useMarketingCampaigns() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('admin_marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCampaigns(
        (data || []).map((c: any) => ({
          ...c,
          target_tier: c.target_tier || [],
          target_audience: c.target_audience || {},
          blackout_hours: c.blackout_hours || { start: '22:00', end: '08:00' },
        }))
      );
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch campaigns'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async (input: MarketingCampaignInput): Promise<MarketingCampaign> => {
    const { data, error } = await supabase
      .from('admin_marketing_campaigns')
      .insert({
        name: input.name,
        name_bn: input.name_bn,
        type: input.type,
        status: input.status || 'draft',
        target_tier: input.target_tier || ['starter', 'growth', 'pro'],
        target_audience: input.target_audience || {},
        max_discount_percent: input.max_discount_percent ?? 10,
        frequency_per_week: input.frequency_per_week ?? 1,
        frequency_per_month: input.frequency_per_month ?? 4,
        min_days_between_messages: input.min_days_between_messages ?? 2,
        use_whatsapp: input.use_whatsapp ?? true,
        use_email: input.use_email ?? true,
        alternate_channels: input.alternate_channels ?? true,
        blackout_hours: input.blackout_hours || { start: '22:00', end: '08:00' },
      } as any)
      .select()
      .single();

    if (error) throw error;
    await fetchCampaigns();
    return data as MarketingCampaign;
  };

  const updateCampaign = async (id: string, input: Partial<MarketingCampaignInput>) => {
    const { error } = await supabase
      .from('admin_marketing_campaigns')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id);

    if (error) throw error;
    await fetchCampaigns();
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase
      .from('admin_marketing_campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchCampaigns();
  };

  const toggleStatus = async (id: string, newStatus: MarketingCampaign['status']) => {
    await updateCampaign(id, { status: newStatus });
  };

  const getCampaignsByType = (type: MarketingCampaign['type']) => {
    return campaigns.filter((c) => c.type === type);
  };

  const getActiveCampaigns = () => {
    return campaigns.filter((c) => c.status === 'active');
  };

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    toggleStatus,
    getCampaignsByType,
    getActiveCampaigns,
  };
}
