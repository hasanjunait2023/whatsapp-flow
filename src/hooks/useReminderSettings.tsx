import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReminderSetting {
  id: string;
  reminder_type: string;
  channel: 'email' | 'whatsapp' | 'both';
  days_offset: number[];
  template_id: string | null;
  email_subject: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderSettingInput {
  reminder_type: string;
  channel: 'email' | 'whatsapp' | 'both';
  days_offset: number[];
  template_id?: string | null;
  email_subject?: string;
  is_active?: boolean;
}

export function useReminderSettings() {
  const [settings, setSettings] = useState<ReminderSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('reminder_settings')
        .select('*')
        .order('reminder_type', { ascending: true });

      if (fetchError) throw fetchError;
      setSettings(
        (data || []).map((s) => ({
          ...s,
          channel: s.channel as 'email' | 'whatsapp' | 'both',
        }))
      );
      setError(null);
    } catch (err) {
      console.error('Error fetching reminder settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (id: string, input: Partial<ReminderSettingInput>) => {
    const { error } = await supabase
      .from('reminder_settings')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    await fetchSettings();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await updateSetting(id, { is_active: isActive });
  };

  const updateDaysOffset = async (id: string, days: number[]) => {
    await updateSetting(id, { days_offset: days });
  };

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSetting,
    toggleActive,
    updateDaysOffset,
  };
}
