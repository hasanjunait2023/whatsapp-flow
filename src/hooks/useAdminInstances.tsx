import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminInstance {
  id: string;
  tenant_id: string;
  tenant_name: string;
  name: string;
  phone_number: string | null;
  status: string;
  message_count: number;
  created_at: string;
}

export function useAdminInstances() {
  const [instances, setInstances] = useState<AdminInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all non-deleted instances
      const { data: instancesData, error: instancesError } = await supabase
        .from('whatsapp_instances')
        .select('id, tenant_id, name, phone_number, status, created_at')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (instancesError) throw instancesError;

      // Fetch tenant names
      const tenantIds = [...new Set(instancesData?.map(i => i.tenant_id) || [])];
      let tenantsMap: Record<string, string> = {};
      
      if (tenantIds.length > 0) {
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, name')
          .in('id', tenantIds);
        
        tenantsMap = (tenants || []).reduce((acc, t) => {
          acc[t.id] = t.name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Fetch message counts per instance (this month) - using a single RPC or optimized approach
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Build instances first without message counts, then fetch counts in batches
      const instanceIds = instancesData?.map(i => i.id) || [];
      let messageCounts: Record<string, number> = {};

      // Fetch counts in parallel batches of 3 to avoid overwhelming the DB
      if (instanceIds.length > 0) {
        const batchSize = 3;
        for (let i = 0; i < instanceIds.length; i += batchSize) {
          const batch = instanceIds.slice(i, i + batchSize);
          const countPromises = batch.map(async (instanceId) => {
            try {
              const { count } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('instance_id', instanceId)
                .gte('created_at', startOfMonth.toISOString());
              return { instanceId, count: count || 0 };
            } catch {
              return { instanceId, count: 0 };
            }
          });
          const results = await Promise.all(countPromises);
          results.forEach(r => {
            messageCounts[r.instanceId] = r.count;
          });
        }
      }

      const enrichedInstances: AdminInstance[] = (instancesData || []).map((instance) => ({
        id: instance.id,
        tenant_id: instance.tenant_id,
        tenant_name: tenantsMap[instance.tenant_id] || 'Unknown',
        name: instance.name,
        phone_number: instance.phone_number,
        status: instance.status,
        message_count: messageCounts[instance.id] || 0,
        created_at: instance.created_at,
      }));

      setInstances(enrichedInstances);
    } catch (err) {
      console.error('Error fetching instances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch instances');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();

    // Real-time subscription for instance status changes
    const channel = supabase
      .channel('admin-instances-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_instances',
        },
        (payload) => {
          const updated = payload.new as any;
          setInstances(prev => 
            prev.map(i => i.id === updated.id 
              ? { ...i, status: updated.status, phone_number: updated.phone_number }
              : i
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'whatsapp_instances',
        },
        (payload) => {
          const deleted = payload.old as any;
          setInstances(prev => prev.filter(i => i.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInstances]);

  return {
    instances,
    loading,
    error,
    refetch: fetchInstances,
  };
}
