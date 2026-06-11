import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ServiceBoard, CreateBoardInput } from './types';

export function useServiceBoards(tenantIdOverride?: string) {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Use override if provided, otherwise use current tenant
  const tenantId = tenantIdOverride || currentTenant?.id;

  const boardsQuery = useQuery({
    queryKey: ['service-boards', tenantId],
    queryFn: async (): Promise<ServiceBoard[]> => {
      if (!tenantId) return [];

      // First get boards the user is a member of
      const { data: memberBoards, error: memberError } = await supabase
        .from('service_board_members')
        .select('board_id')
        .eq('user_id', user?.id);

      if (memberError) throw memberError;

      const boardIds = memberBoards?.map(m => m.board_id) || [];
      
      if (boardIds.length === 0) return [];

      // Fetch boards with counts
      const { data, error } = await supabase
        .from('service_boards')
        .select(`
          *,
          member_agg:service_board_members(count),
          card_agg:service_cards(count)
        `)
        .in('id', boardIds)
        .is('archived_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(board => {
        const { member_agg, card_agg, ...rest } = board as any;
        return {
          ...rest,
          member_count: member_agg?.[0]?.count || 0,
          card_count: card_agg?.[0]?.count || 0,
        } as ServiceBoard;
      });
    },
    enabled: !!tenantId && !!user?.id,
    staleTime: 30000,
  });

  const createBoardMutation = useMutation({
    mutationFn: async (input: CreateBoardInput) => {
      if (!tenantId || !user?.id) throw new Error('No tenant or user');

      // Create board
      const { data: board, error: boardError } = await supabase
        .from('service_boards')
        .insert({
          tenant_id: tenantId,
          name: input.name,
          description: input.description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (boardError) throw boardError;

      // Add creator as board owner
      const { error: memberError } = await supabase
        .from('service_board_members')
        .insert({
          tenant_id: tenantId,
          board_id: board.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      // Create default lists
      const defaultLists = ['To Do', 'In Progress', 'Review', 'Done'];
      const { error: listsError } = await supabase
        .from('service_lists')
        .insert(
          defaultLists.map((name, index) => ({
            tenant_id: tenantId,
            board_id: board.id,
            name,
            position_numeric: (index + 1) * 1000,
          }))
        );

      if (listsError) throw listsError;

      return board as ServiceBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-boards'] });
      toast.success('Board created successfully');
    },
    onError: (error) => {
      console.error('Error creating board:', error);
      toast.error('Failed to create board');
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceBoard> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_boards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ServiceBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-boards'] });
      toast.success('Board updated');
    },
    onError: (error) => {
      console.error('Error updating board:', error);
      toast.error('Failed to update board');
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      const { error } = await supabase
        .from('service_boards')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', boardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-boards'] });
      toast.success('Board archived');
    },
    onError: (error) => {
      console.error('Error archiving board:', error);
      toast.error('Failed to archive board');
    },
  });

  return {
    boards: boardsQuery.data || [],
    isLoading: boardsQuery.isLoading,
    error: boardsQuery.error,
    createBoard: createBoardMutation.mutateAsync,
    updateBoard: updateBoardMutation.mutateAsync,
    deleteBoard: deleteBoardMutation.mutateAsync,
    isCreating: createBoardMutation.isPending,
  };
}
