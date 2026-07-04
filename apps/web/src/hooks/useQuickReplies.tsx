import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export type QuickReplyContentType = 'text' | 'image' | 'video' | 'audio' | 'mixed';

export interface MediaItem {
  type: 'image' | 'video' | 'audio';
  url: string;
  filename: string;
  caption?: string;
}

export interface QuickReply {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  shortcut: string | null;
  content_type: QuickReplyContentType;
  media_url: string | null;
  media_filename: string | null;
  media_items: MediaItem[];
  created_at: string;
  updated_at: string;
}

export interface QuickReplyInput {
  title: string;
  content: string;
  shortcut?: string;
  content_type?: QuickReplyContentType;
  media_url?: string;
  media_filename?: string;
  media_items?: MediaItem[];
}

export function useQuickReplies() {
  const { currentTenant } = useTenant();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuickReplies = useCallback(async () => {
    if (!currentTenant) {
      setQuickReplies([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('title');

      if (error) throw error;
      // Map DB data to QuickReply[], handling JSONB media_items
      const replies = (data || []).map((row) => ({
        ...row,
        media_items: (row.media_items as unknown as MediaItem[]) || [],
      })) as QuickReply[];
      setQuickReplies(replies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quick replies');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    fetchQuickReplies();
  }, [fetchQuickReplies]);

  const createQuickReply = async (input: QuickReplyInput) => {
    if (!currentTenant) throw new Error('No tenant selected');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertData: any = {
      tenant_id: currentTenant.id,
      title: input.title,
      content: input.content,
      shortcut: input.shortcut || null,
      content_type: input.content_type || 'text',
      media_url: input.media_url || null,
      media_filename: input.media_filename || null,
      media_items: input.media_items || [],
    };

    const { data, error } = await supabase
      .from('quick_replies')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    const newReply: QuickReply = {
      ...data,
      media_items: (data.media_items as unknown as MediaItem[]) || [],
    } as QuickReply;
    setQuickReplies((prev) => [...prev, newReply].sort((a, b) => a.title.localeCompare(b.title)));
    return newReply;
  };

  const updateQuickReply = async (id: string, input: Partial<QuickReplyInput>) => {
    const updateData: Record<string, unknown> = { 
      ...input, 
      updated_at: new Date().toISOString(),
      media_url: input.media_url ?? null,
      media_filename: input.media_filename ?? null,
    };
    if (input.media_items !== undefined) {
      updateData.media_items = input.media_items;
    }

    const { error } = await supabase
      .from('quick_replies')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    setQuickReplies((prev) =>
      prev.map((qr) => (qr.id === id ? { ...qr, ...input } as QuickReply : qr))
    );
  };

  const deleteQuickReply = async (id: string) => {
    const { error } = await supabase.from('quick_replies').delete().eq('id', id);
    if (error) throw error;
    setQuickReplies((prev) => prev.filter((qr) => qr.id !== id));
  };

  const searchQuickReplies = (query: string): QuickReply[] => {
    if (!query) return quickReplies;
    const lowerQuery = query.toLowerCase();
    return quickReplies.filter(
      (qr) =>
        qr.title.toLowerCase().includes(lowerQuery) ||
        qr.content.toLowerCase().includes(lowerQuery) ||
        qr.shortcut?.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    quickReplies,
    loading,
    error,
    refetch: fetchQuickReplies,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    searchQuickReplies,
  };
}
