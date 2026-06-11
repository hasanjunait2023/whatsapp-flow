import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export interface Label {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ContactLabel {
  id: string;
  contact_id: string;
  label_id: string;
  label?: Label;
}

export function useLabels() {
  const { currentTenant } = useTenant();
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabels = useCallback(async () => {
    if (!currentTenant) {
      setLabels([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('name');

      if (error) throw error;
      setLabels(data || []);
    } catch (err) {
      console.error('Error fetching labels:', err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const createLabel = async (name: string, color: string = '#6366f1') => {
    if (!currentTenant) throw new Error('No tenant selected');

    const { data, error } = await supabase
      .from('labels')
      .insert({ tenant_id: currentTenant.id, name, color })
      .select()
      .single();

    if (error) throw error;
    setLabels((prev) => [...prev, data]);
    return data;
  };

  const updateLabel = async (id: string, updates: Partial<Label>) => {
    const { error } = await supabase
      .from('labels')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const deleteLabel = async (id: string) => {
    const { error } = await supabase.from('labels').delete().eq('id', id);
    if (error) throw error;
    setLabels((prev) => prev.filter((l) => l.id !== id));
  };

  const getContactLabels = useCallback(async (contactId: string): Promise<Label[]> => {
    const { data, error } = await supabase
      .from('contact_labels')
      .select('*, label:labels(*)')
      .eq('contact_id', contactId);

    if (error) throw error;
    return (data || []).map((cl: any) => cl.label).filter(Boolean);
  }, []);

  const addLabelToContact = useCallback(async (contactId: string, labelId: string) => {
    const { error } = await supabase
      .from('contact_labels')
      .insert({ contact_id: contactId, label_id: labelId });

    if (error) throw error;
  }, []);

  const removeLabelFromContact = useCallback(async (contactId: string, labelId: string) => {
    const { error } = await supabase
      .from('contact_labels')
      .delete()
      .eq('contact_id', contactId)
      .eq('label_id', labelId);

    if (error) throw error;
  }, []);

  return {
    labels,
    loading,
    refetch: fetchLabels,
    createLabel,
    updateLabel,
    deleteLabel,
    getContactLabels,
    addLabelToContact,
    removeLabelFromContact,
  };
}
