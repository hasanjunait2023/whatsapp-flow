import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  channel: 'whatsapp' | 'email' | 'both';
  content: string;
  subject: string | null;
  placeholders: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplateInput {
  name: string;
  category: string;
  channel: 'whatsapp' | 'email' | 'both';
  content: string;
  subject?: string;
  placeholders?: string[];
  is_active?: boolean;
}

export function useMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('message_templates')
        .select('*')
        .order('category', { ascending: true });

      if (fetchError) throw fetchError;
      
      setTemplates(
        (data || []).map((t) => ({
          ...t,
          channel: t.channel as 'whatsapp' | 'email' | 'both',
          placeholders: Array.isArray(t.placeholders) ? t.placeholders as string[] : [],
        }))
      );
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch templates'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (input: MessageTemplateInput) => {
    const { error } = await supabase
      .from('message_templates')
      .insert({
        ...input,
        placeholders: input.placeholders || [],
      });

    if (error) throw error;
    await fetchTemplates();
  };

  const updateTemplate = async (id: string, input: Partial<MessageTemplateInput>) => {
    const { error } = await supabase
      .from('message_templates')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    await fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchTemplates();
  };

  const getTemplatesByCategory = (category: string) => {
    return templates.filter((t) => t.category === category && t.is_active);
  };

  const renderTemplate = (template: MessageTemplate, values: Record<string, string>) => {
    let content = template.content;
    Object.entries(values).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return content;
  };

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplatesByCategory,
    renderTemplate,
  };
}
