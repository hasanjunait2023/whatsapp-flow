import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { AdminPermissions, DEFAULT_PERMISSIONS } from './useAdminPermissions';

export interface AdminAccessRequest {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  requested_by: string;
  requester_email: string | null;
  requester_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  permissions: AdminPermissions;
  reason: string | null;
  reviewed_by: string | null;
  reviewer_email: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export function useAdminRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdminAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: requestsData, error: reqError } = await supabase
        .from('admin_access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;

      // Get user IDs for profile lookup
      const userIds = new Set<string>();
      requestsData?.forEach(r => {
        userIds.add(r.user_id);
        userIds.add(r.requested_by);
        if (r.reviewed_by) userIds.add(r.reviewed_by);
      });

      // Fetch profiles
      let profilesMap: Record<string, { email: string | null; full_name: string | null }> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', Array.from(userIds));

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { email: p.email, full_name: p.full_name };
          return acc;
        }, {} as Record<string, { email: string | null; full_name: string | null }>);
      }

      const enrichedRequests: AdminAccessRequest[] = (requestsData || []).map(r => ({
        id: r.id,
        user_id: r.user_id,
        user_email: profilesMap[r.user_id]?.email || null,
        user_name: profilesMap[r.user_id]?.full_name || null,
        requested_by: r.requested_by,
        requester_email: profilesMap[r.requested_by]?.email || null,
        requester_name: profilesMap[r.requested_by]?.full_name || null,
        status: r.status as 'pending' | 'approved' | 'rejected',
        permissions: (r.permissions as unknown as AdminPermissions) || DEFAULT_PERMISSIONS,
        reason: r.reason,
        reviewed_by: r.reviewed_by,
        reviewer_email: r.reviewed_by ? profilesMap[r.reviewed_by]?.email || null : null,
        reviewer_name: r.reviewed_by ? profilesMap[r.reviewed_by]?.full_name || null : null,
        reviewed_at: r.reviewed_at,
        review_notes: r.review_notes,
        created_at: r.created_at,
      }));

      setRequests(enrichedRequests);
    } catch (err) {
      console.error('Error fetching admin requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitRequest = useCallback(async (
    userId: string,
    permissions: AdminPermissions,
    reason?: string
  ) => {
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('admin_access_requests')
      .insert([{
        user_id: userId,
        requested_by: user.id,
        permissions: permissions as unknown as Record<string, unknown>,
        reason: reason || null,
        status: 'pending',
      }] as any);

    if (error) throw error;

    // Log to audit
    await supabase.from('admin_audit_logs').insert([{
      admin_id: user.id,
      action: 'admin_request_created',
      entity_type: 'admin_request',
      entity_id: userId,
      details: { user_id: userId, permissions, reason },
    }] as any);

    await fetchRequests();
  }, [user, fetchRequests]);

  const approveRequest = useCallback(async (
    requestId: string,
    reviewNotes?: string
  ) => {
    if (!user) throw new Error('Not authenticated');

    // Get the request first
    const { data: request, error: fetchError } = await supabase
      .from('admin_access_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    // Update request status
    const { error: updateError } = await supabase
      .from('admin_access_requests')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Grant admin role with permissions
    const { error: roleError } = await supabase
      .from('system_roles')
      .insert([{
        user_id: request.user_id,
        role: 'admin',
        is_super_admin: false,
        permissions: request.permissions,
        granted_by: user.id,
        granted_at: new Date().toISOString(),
      }] as any);

    if (roleError) throw roleError;

    // Log to audit
    await supabase.from('admin_audit_logs').insert([{
      admin_id: user.id,
      action: 'admin_request_approved',
      entity_type: 'admin_request',
      entity_id: request.user_id,
      details: { request_id: requestId, permissions: request.permissions },
    }] as any);

    await fetchRequests();
  }, [user, fetchRequests]);

  const rejectRequest = useCallback(async (
    requestId: string,
    reviewNotes?: string
  ) => {
    if (!user) throw new Error('Not authenticated');

    // Get the request first
    const { data: request } = await supabase
      .from('admin_access_requests')
      .select('user_id')
      .eq('id', requestId)
      .single();

    const { error } = await supabase
      .from('admin_access_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('id', requestId);

    if (error) throw error;

    // Log to audit
    await supabase.from('admin_audit_logs').insert([{
      admin_id: user.id,
      action: 'admin_request_rejected',
      entity_type: 'admin_request',
      entity_id: request?.user_id || requestId,
      details: { request_id: requestId, reason: reviewNotes },
    }] as any);

    await fetchRequests();
  }, [user, fetchRequests]);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    pendingRequests,
    resolvedRequests,
    loading,
    error,
    refetch: fetchRequests,
    submitRequest,
    approveRequest,
    rejectRequest,
  };
}
