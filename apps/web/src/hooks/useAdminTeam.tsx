import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminTeamMember {
  id: string;
  user_id: string;
  role: 'admin';
  is_super_admin: boolean;
  created_at: string;
  profile?: {
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useAdminTeam() {
  const [members, setMembers] = useState<AdminTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAdminTeam = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all admin users from system_roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('system_roles')
        .select('id, user_id, role, is_super_admin, created_at')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      // Fetch profiles for each admin
      const memberIds = rolesData?.map((r) => r.user_id) || [];
      
      let profilesData: { id: string; email: string | null; full_name: string | null; avatar_url: string | null }[] = [];
      if (memberIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', memberIds);
        
        if (profilesError) {
          console.warn('Error fetching admin profiles:', profilesError);
        } else {
          profilesData = data || [];
        }
      }

      const profilesMap = new Map(profilesData.map((p) => [p.id, p]));

      // Map profiles with fallback
      const membersWithProfiles = (rolesData || []).map((role) => ({
        ...role,
        role: 'admin' as const,
        profile: profilesMap.get(role.user_id) ?? {
          email: null,
          full_name: null,
          avatar_url: null,
        },
      })) as AdminTeamMember[];

      setMembers(membersWithProfiles);
    } catch (err) {
      console.error('Error fetching admin team:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminTeam();
  }, [fetchAdminTeam]);

  return {
    members,
    loading,
    error,
    refetch: fetchAdminTeam,
  };
}
