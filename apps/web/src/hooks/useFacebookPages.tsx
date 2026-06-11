import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';
import { useMyResourceAccess } from './useTeamMemberAccess';

export interface FacebookPage {
  id: string;
  tenant_id: string;
  page_id: string;
  page_name: string;
  profile_picture_url: string | null;
  is_default: boolean;
  status: 'active' | 'disconnected' | 'token_expired';
  webhook_verify_token: string;
  last_connected_at: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacebookPageInput {
  page_id: string;
  page_name: string;
  page_access_token: string;
  app_secret?: string;
  profile_picture_url?: string;
  is_default?: boolean;
}

export function useFacebookPages() {
  const { currentTenant } = useTenant();
  const { allowedPages, isOwnerOrManager, accessLoaded } = useMyResourceAccess();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPages = useCallback(async () => {
    if (!currentTenant) {
      setPages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('facebook_pages')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      let filteredData = (data || []) as FacebookPage[];

      // Filter based on user's resource access (unless owner/manager or no restrictions)
      if (!isOwnerOrManager && allowedPages.length > 0) {
        filteredData = filteredData.filter(page => allowedPages.includes(page.id));
      }

      setPages(filteredData);
      setError(null);
    } catch (err) {
      console.error('Error fetching Facebook pages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch pages'));
    } finally {
      setLoading(false);
    }
  }, [currentTenant, isOwnerOrManager, allowedPages]);

  useEffect(() => {
    if (accessLoaded) {
      fetchPages();
    }
  }, [fetchPages, accessLoaded]);

  const connectPage = async (input: FacebookPageInput) => {
    if (!currentTenant) throw new Error('No tenant selected');

    // If this is the first page or marked as default, set it
    const shouldBeDefault = input.is_default || pages.length === 0;

    // If setting as default, unset other defaults first
    if (shouldBeDefault && pages.length > 0) {
      await supabase
        .from('facebook_pages')
        .update({ is_default: false })
        .eq('tenant_id', currentTenant.id);
    }

    // Generate a unique verify token for webhook verification
    const webhookVerifyToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    const { data, error } = await supabase
      .from('facebook_pages')
      .insert({
        tenant_id: currentTenant.id,
        page_id: input.page_id?.trim(),
        page_name: input.page_name?.trim(),
        page_access_token: input.page_access_token?.trim(),
        app_secret: input.app_secret?.trim(),
        profile_picture_url: input.profile_picture_url,
        is_default: shouldBeDefault,
        webhook_verify_token: webhookVerifyToken,
        status: 'disconnected', // Will become 'active' after webhook verification
      })
      .select()
      .single();

    if (error) throw error;
    await fetchPages();
    return data as FacebookPage;
  };

  const updatePage = async (pageId: string, updates: Partial<FacebookPageInput>) => {
    const { error } = await supabase
      .from('facebook_pages')
      .update(updates)
      .eq('id', pageId);

    if (error) throw error;
    await fetchPages();
  };

  const disconnectPage = async (pageId: string) => {
    const { error } = await supabase
      .from('facebook_pages')
      .delete()
      .eq('id', pageId);

    if (error) throw error;
    await fetchPages();
  };

  const setDefaultPage = async (pageId: string) => {
    if (!currentTenant) throw new Error('No tenant selected');

    // Unset all defaults
    await supabase
      .from('facebook_pages')
      .update({ is_default: false })
      .eq('tenant_id', currentTenant.id);

    // Set new default
    const { error } = await supabase
      .from('facebook_pages')
      .update({ is_default: true })
      .eq('id', pageId);

    if (error) throw error;
    await fetchPages();
  };

  const defaultPage = pages.find(p => p.is_default) || pages[0];
  const activePages = pages.filter(p => p.status === 'active');

  return {
    pages,
    loading,
    error,
    refetch: fetchPages,
    connectPage,
    updatePage,
    disconnectPage,
    setDefaultPage,
    defaultPage,
    activePages,
  };
}
