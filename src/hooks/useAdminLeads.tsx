import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MarketingLead {
  id: string;
  full_name: string;
  whatsapp_number: string;
  email: string;
  business_name: string;
  status: 'warm' | 'hot' | 'contacted' | 'converted' | 'lost';
  source: string;
  notes: string | null;
  demo_accessed_at: string | null;
  demo_access_count: number;
  created_at: string;
  updated_at: string;
}

export function useAdminLeads() {
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data as MarketingLead[]);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch leads');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLeadStatus = async (leadId: string, status: MarketingLead['status']) => {
    try {
      const { error } = await supabase
        .from('marketing_leads')
        .update({ status })
        .eq('id', leadId);

      if (error) throw error;
      
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, status } : lead
      ));
      toast.success('Lead status updated');
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const updateLeadNotes = async (leadId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('marketing_leads')
        .update({ notes })
        .eq('id', leadId);

      if (error) throw error;
      
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, notes } : lead
      ));
      toast.success('Notes updated');
    } catch (err: any) {
      toast.error('Failed to update notes');
    }
  };

  const deleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('marketing_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      
      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      toast.success('Lead deleted');
    } catch (err: any) {
      toast.error('Failed to delete lead');
    }
  };

  const stats = {
    total: leads.length,
    warm: leads.filter(l => l.status === 'warm').length,
    hot: leads.filter(l => l.status === 'hot').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
    lost: leads.filter(l => l.status === 'lost').length,
  };

  return {
    leads,
    isLoading,
    error,
    stats,
    refetch: fetchLeads,
    updateLeadStatus,
    updateLeadNotes,
    deleteLead,
  };
}
