import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MediaItem {
  type: 'image' | 'video' | 'audio';
  url: string;
  filename: string;
  caption?: string;
}

export interface WhatsAppAutoMessages {
  id: string;
  tenant_id: string;
  welcome_enabled: boolean;
  welcome_message: string;
  welcome_media_items: MediaItem[];
  away_enabled: boolean;
  away_message: string;
  away_media_items: MediaItem[];
  away_cooldown_hours: number;
  followup_enabled: boolean;
  followup_message: string;
  followup_media_items: MediaItem[];
  followup_delay_hours: number;
}

export interface WhatsAppAutoMessagesInput {
  welcome_enabled?: boolean;
  welcome_message?: string;
  welcome_media_items?: MediaItem[];
  away_enabled?: boolean;
  away_message?: string;
  away_media_items?: MediaItem[];
  away_cooldown_hours?: number;
  followup_enabled?: boolean;
  followup_message?: string;
  followup_media_items?: MediaItem[];
  followup_delay_hours?: number;
}

const DEFAULT_SETTINGS: Omit<WhatsAppAutoMessages, 'id' | 'tenant_id'> = {
  welcome_enabled: false,
  welcome_message: 'Welcome! Thank you for reaching out. How can we help you today?',
  welcome_media_items: [],
  away_enabled: false,
  away_message: 'We are currently unavailable. We will respond as soon as possible!',
  away_media_items: [],
  away_cooldown_hours: 24,
  followup_enabled: false,
  followup_message: 'Hi! We noticed you were browsing. Can we help you with anything?',
  followup_media_items: [],
  followup_delay_hours: 6,
};

/**
 * Admin-specific hook for WhatsApp auto messages.
 * Uses the System Tenant instead of `useTenant()` context.
 * Admin has full access to all features (no Pro plan check).
 */
export function useAdminWhatsAppAutoMessages() {
  const [systemTenantId, setSystemTenantId] = useState<string | null>(null);
  const [settings, setSettings] = useState<WhatsAppAutoMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Admin always has full access
  const hasFollowupAccess = true;

  // Fetch System Tenant ID on mount
  useEffect(() => {
    async function fetchSystemTenant() {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('settings->>is_system_tenant', 'true')
        .maybeSingle();

      if (error) {
        console.error('Error fetching system tenant:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setSystemTenantId(data.id);
      } else {
        console.warn('No system tenant found');
        setLoading(false);
      }
    }

    fetchSystemTenant();
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!systemTenantId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_auto_messages')
        .select('*')
        .eq('tenant_id', systemTenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching admin auto messages settings:', error);
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          tenant_id: data.tenant_id,
          welcome_enabled: data.welcome_enabled ?? false,
          welcome_message: data.welcome_message ?? DEFAULT_SETTINGS.welcome_message,
          welcome_media_items: (data.welcome_media_items as unknown as MediaItem[]) ?? [],
          away_enabled: data.away_enabled ?? false,
          away_message: data.away_message ?? DEFAULT_SETTINGS.away_message,
          away_media_items: (data.away_media_items as unknown as MediaItem[]) ?? [],
          away_cooldown_hours: data.away_cooldown_hours ?? 24,
          followup_enabled: data.followup_enabled ?? false,
          followup_message: data.followup_message ?? DEFAULT_SETTINGS.followup_message,
          followup_media_items: (data.followup_media_items as unknown as MediaItem[]) ?? [],
          followup_delay_hours: data.followup_delay_hours ?? 6,
        });
      } else {
        // Return defaults if no settings exist
        setSettings({
          id: '',
          tenant_id: systemTenantId,
          ...DEFAULT_SETTINGS,
        });
      }
    } catch (error) {
      console.error('Failed to fetch admin auto messages settings:', error);
    } finally {
      setLoading(false);
    }
  }, [systemTenantId]);

  useEffect(() => {
    if (systemTenantId) {
      fetchSettings();
    }
  }, [systemTenantId, fetchSettings]);

  const saveSettings = async (input: WhatsAppAutoMessagesInput): Promise<boolean> => {
    if (!systemTenantId) {
      toast.error('System tenant not available');
      return false;
    }

    setSaving(true);
    try {
      const payload = {
        tenant_id: systemTenantId,
        welcome_enabled: input.welcome_enabled ?? settings?.welcome_enabled ?? false,
        welcome_message: input.welcome_message ?? settings?.welcome_message ?? DEFAULT_SETTINGS.welcome_message,
        welcome_media_items: JSON.parse(JSON.stringify(input.welcome_media_items ?? settings?.welcome_media_items ?? [])),
        away_enabled: input.away_enabled ?? settings?.away_enabled ?? false,
        away_message: input.away_message ?? settings?.away_message ?? DEFAULT_SETTINGS.away_message,
        away_media_items: JSON.parse(JSON.stringify(input.away_media_items ?? settings?.away_media_items ?? [])),
        away_cooldown_hours: input.away_cooldown_hours ?? settings?.away_cooldown_hours ?? 24,
        followup_enabled: input.followup_enabled ?? settings?.followup_enabled ?? false,
        followup_message: input.followup_message ?? settings?.followup_message ?? DEFAULT_SETTINGS.followup_message,
        followup_media_items: JSON.parse(JSON.stringify(input.followup_media_items ?? settings?.followup_media_items ?? [])),
        followup_delay_hours: input.followup_delay_hours ?? settings?.followup_delay_hours ?? 6,
      };

      const { data, error } = await supabase
        .from('whatsapp_auto_messages')
        .upsert([payload], { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) {
        console.error('Error saving admin auto messages settings:', error);
        toast.error('Failed to save settings');
        return false;
      }

      setSettings({
        id: data.id,
        tenant_id: data.tenant_id,
        welcome_enabled: data.welcome_enabled ?? false,
        welcome_message: data.welcome_message ?? DEFAULT_SETTINGS.welcome_message,
        welcome_media_items: (data.welcome_media_items as unknown as MediaItem[]) ?? [],
        away_enabled: data.away_enabled ?? false,
        away_message: data.away_message ?? DEFAULT_SETTINGS.away_message,
        away_media_items: (data.away_media_items as unknown as MediaItem[]) ?? [],
        away_cooldown_hours: data.away_cooldown_hours ?? 24,
        followup_enabled: data.followup_enabled ?? false,
        followup_message: data.followup_message ?? DEFAULT_SETTINGS.followup_message,
        followup_media_items: (data.followup_media_items as unknown as MediaItem[]) ?? [],
        followup_delay_hours: data.followup_delay_hours ?? 6,
      });

      toast.success('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save admin auto messages settings:', error);
      toast.error('Failed to save settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    saveSettings,
    refetch: fetchSettings,
    hasFollowupAccess,
    systemTenantId,
  };
}
