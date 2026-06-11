import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLabels, Label } from './useLabels';

export function useFBLabels() {
  const { labels, loading: labelsLoading, createLabel } = useLabels();
  const [loading, setLoading] = useState(false);

  const getFBContactLabels = useCallback(async (contactId: string): Promise<Label[]> => {
    const { data, error } = await supabase
      .from('fb_contact_labels')
      .select('*, label:labels(*)')
      .eq('contact_id', contactId);

    if (error) throw error;
    return (data || []).map((cl: any) => cl.label).filter(Boolean);
  }, []);

  const addLabelToFBContact = async (contactId: string, labelId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('fb_contact_labels')
        .insert({ contact_id: contactId, label_id: labelId });

      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeLabelFromFBContact = async (contactId: string, labelId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('fb_contact_labels')
        .delete()
        .eq('contact_id', contactId)
        .eq('label_id', labelId);

      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    labels,
    labelsLoading,
    loading,
    createLabel,
    getFBContactLabels,
    addLabelToFBContact,
    removeLabelFromFBContact,
  };
}
