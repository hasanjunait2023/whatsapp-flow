import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export type ComplaintCategory = 'product_issue' | 'delivery' | 'refund' | 'other';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Complaint {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  order_id: string | null;
  reported_by: string;
  assigned_to: string | null;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: { id: string; name: string | null; phone_number: string } | null;
  order?: { id: string; order_number: string } | null;
  reporter?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface ComplaintStats {
  open: number;
  in_progress: number;
  resolved: number;
  critical: number;
}

export interface CreateComplaintData {
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  contact_id?: string | null;
  order_id?: string | null;
}

export function useComplaints() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  // Fetch all complaints
  const { data: complaints = [], isLoading, error } = useQuery({
    queryKey: ['complaints', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          contact:contacts(id, name, phone_number),
          order:orders(id, order_number)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch reporter and assignee profiles separately
      const userIds = new Set<string>();
      data?.forEach((c: any) => {
        if (c.reported_by) userIds.add(c.reported_by);
        if (c.assigned_to) userIds.add(c.assigned_to);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data?.map((c: any) => ({
        ...c,
        reporter: profileMap.get(c.reported_by) || null,
        assignee: c.assigned_to ? profileMap.get(c.assigned_to) || null : null,
      })) as Complaint[];
    },
    enabled: !!tenantId,
  });

  // Calculate stats
  const stats: ComplaintStats = {
    open: complaints.filter(c => c.status === 'open').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length,
    critical: complaints.filter(c => c.priority === 'critical' && c.status !== 'resolved' && c.status !== 'closed').length,
  };

  // Create complaint
  const createComplaint = useMutation({
    mutationFn: async (data: CreateComplaintData) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: complaint, error } = await supabase
        .from('complaints')
        .insert({
          tenant_id: tenantId,
          reported_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      // Log to customer journey if contact is linked
      if (data.contact_id) {
        await supabase.from('customer_journey_events').insert({
          tenant_id: tenantId,
          contact_id: data.contact_id,
          event_type: 'complaint_raised',
          event_category: 'system',
          title: `Complaint: ${data.title}`,
          description: data.description,
          metadata: { complaint_id: complaint.id, priority: data.priority, category: data.category },
          created_by: user.id,
        });
      }

      return complaint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', tenantId] });
      toast({ title: 'Complaint created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create complaint', description: error.message, variant: 'destructive' });
    },
  });

  // Update complaint
  const updateComplaint = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Complaint> & { id: string }) => {
      const { data, error } = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', tenantId] });
      toast({ title: 'Complaint updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update complaint', description: error.message, variant: 'destructive' });
    },
  });

  // Resolve complaint
  const resolveComplaint = useMutation({
    mutationFn: async ({ id, notes, contactId }: { id: string; notes: string; contactId?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('complaints')
        .update({
          status: 'resolved' as ComplaintStatus,
          resolution_notes: notes,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log to customer journey if contact is linked
      if (contactId && tenantId) {
        await supabase.from('customer_journey_events').insert({
          tenant_id: tenantId,
          contact_id: contactId,
          event_type: 'handoff_resolved',
          event_category: 'system',
          title: 'Complaint resolved',
          description: notes,
          metadata: { complaint_id: id },
          created_by: user.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', tenantId] });
      toast({ title: 'Complaint resolved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to resolve complaint', description: error.message, variant: 'destructive' });
    },
  });

  // Assign complaint to a team member
  const assignComplaint = useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string | null }) => {
      const { data, error } = await supabase
        .from('complaints')
        .update({ assigned_to: assigneeId })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', tenantId] });
      toast({ title: 'Complaint assigned' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to assign complaint', description: error.message, variant: 'destructive' });
    },
  });

  // Delete complaint
  const deleteComplaint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', tenantId] });
      toast({ title: 'Complaint deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete complaint', description: error.message, variant: 'destructive' });
    },
  });

  return {
    complaints,
    stats,
    isLoading,
    error,
    createComplaint,
    updateComplaint,
    resolveComplaint,
    assignComplaint,
    deleteComplaint,
  };
}
