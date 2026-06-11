import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
  announcement_enabled: boolean;
  announcement_banner: string;
  default_trial_days: number;
  grace_period_days: number;
  support_email: string;
  // WhatsApp Automation Controls
  whatsapp_followup_enabled: boolean;
  [key: string]: unknown;
}

export function useAdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    maintenance_message: '',
    announcement_enabled: false,
    announcement_banner: '',
    default_trial_days: 14,
    grace_period_days: 7,
    support_email: '',
    whatsapp_followup_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('key, value');

      if (fetchError) throw fetchError;

      const settingsMap: Partial<SystemSettings> = {};
      (data || []).forEach(item => {
        // Handle both direct values and JSON wrapped values
        const value = typeof item.value === 'object' && 'value' in (item.value as object)
          ? (item.value as { value: unknown }).value
          : item.value;
        settingsMap[item.key] = value as unknown;
      });

      setSettings(prev => ({ ...prev, ...settingsMap }));
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = useCallback(async (key: string, value: unknown) => {
    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', key)
        .single();

      const jsonValue = { value } as any;

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('system_settings')
          .update({ value: jsonValue })
          .eq('key', key);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('system_settings')
          .insert([{ key, value: jsonValue }] as any);

        if (error) throw error;
      }

      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error('Error updating setting:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSetting,
  };
}
