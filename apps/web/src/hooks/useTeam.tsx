import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'agent';
  created_at: string;
  profile?: {
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TeamInvitation {
  id: string;
  email: string;
  role: 'owner' | 'manager' | 'agent';
  expires_at: string;
  created_at: string;
  invited_by: string;
}

export function useTeam() {
  const { currentTenant, isOwner, isManager } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const membersQueryKey = ['team-members', currentTenant?.id];
  const invitationsQueryKey = ['team-invitations', currentTenant?.id];

  // Fetch team members with React Query caching
  const { 
    data: members = [], 
    isLoading: membersLoading, 
    error: membersError 
  } = useQuery({
    queryKey: membersQueryKey,
    queryFn: async () => {
      if (!currentTenant) return [];

      // Fetch team members
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .eq('tenant_id', currentTenant.id);

      if (rolesError) throw rolesError;

      // Fetch profiles for each member
      const memberIds = rolesData?.map((r) => r.user_id) || [];
      
      let profilesData: { id: string; email: string | null; full_name: string | null; avatar_url: string | null }[] = [];
      if (memberIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', memberIds);
        
        if (!profilesError) {
          profilesData = data || [];
        }
      }

      const profilesMap = new Map(profilesData.map((p) => [p.id, p]));

      return (rolesData || []).map((role) => ({
        ...role,
        profile: profilesMap.get(role.user_id) ?? {
          email: null,
          full_name: null,
          avatar_url: null,
        },
      })) as TeamMember[];
    },
    enabled: !!currentTenant,
    staleTime: 1000 * 60 * 5, // 5 minutes - team data doesn't change often
  });

  // Fetch pending invitations with React Query caching
  const { 
    data: invitations = [], 
    isLoading: invitationsLoading 
  } = useQuery({
    queryKey: invitationsQueryKey,
    queryFn: async () => {
      if (!currentTenant) return [];

      const { data: invitesData } = await supabase
        .from('team_invitations')
        .select('id, email, role, expires_at, created_at, invited_by')
        .eq('tenant_id', currentTenant.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      return (invitesData || []) as TeamInvitation[];
    },
    enabled: !!currentTenant,
    staleTime: 1000 * 60 * 2, // 2 minutes - invitations may change more
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'manager' | 'agent' }) => {
      if (!currentTenant || !user) throw new Error('Not authenticated');

      const { error } = await supabase.from('team_invitations').insert({
        tenant_id: currentTenant.id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This email has already been invited');
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Invitation sent',
        description: `An invitation has been sent to ${variables.email}`,
      });
      queryClient.invalidateQueries({ queryKey: invitationsQueryKey });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationsQueryKey });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: 'manager' | 'agent' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
    },
  });

  const inviteMember = async (email: string, role: 'manager' | 'agent') => {
    return inviteMutation.mutateAsync({ email, role });
  };

  const cancelInvitation = async (invitationId: string) => {
    return cancelInvitationMutation.mutateAsync(invitationId);
  };

  const updateMemberRole = async (memberId: string, newRole: 'manager' | 'agent') => {
    return updateRoleMutation.mutateAsync({ memberId, newRole });
  };

  const removeMember = async (memberId: string) => {
    return removeMemberMutation.mutateAsync(memberId);
  };

  const canManageTeam = isOwner || isManager;
  const loading = membersLoading || invitationsLoading;

  return {
    members,
    invitations,
    loading,
    error: membersError as Error | null,
    canManageTeam,
    inviteMember,
    cancelInvitation,
    updateMemberRole,
    removeMember,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
      queryClient.invalidateQueries({ queryKey: invitationsQueryKey });
    },
  };
}
