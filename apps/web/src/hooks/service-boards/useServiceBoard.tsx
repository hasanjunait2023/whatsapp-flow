import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  ServiceBoard,
  ServiceList,
  ServiceCard,
  ServiceLabel,
  CreateListInput,
  CreateCardInput,
  MoveCardInput,
  calculatePosition,
} from './types';

export interface BoardData {
  board: ServiceBoard;
  lists: ServiceList[];
  cards: ServiceCard[];
  labels: ServiceLabel[];
}

export function useServiceBoard(boardId: string | undefined, tenantIdOverride?: string) {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Use override if provided, otherwise use current tenant
  const tenantId = tenantIdOverride || currentTenant?.id;

  // Main board data query
  const boardQuery = useQuery({
    queryKey: ['service-board', boardId],
    queryFn: async (): Promise<BoardData | null> => {
      if (!boardId) return null;

      // Fetch board
      const { data: board, error: boardError } = await supabase
        .from('service_boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError) throw boardError;

      // Fetch lists
      const { data: lists, error: listsError } = await supabase
        .from('service_lists')
        .select('*')
        .eq('board_id', boardId)
        .eq('is_archived', false)
        .order('position_numeric', { ascending: true });

      if (listsError) throw listsError;

      // Fetch cards with labels and member count
      const { data: cards, error: cardsError } = await supabase
        .from('service_cards')
        .select(`
          *,
          card_labels:service_card_labels(
            label:service_labels(*)
          ),
          member_agg:service_card_members(count),
          comment_agg:service_card_comments(count),
          checklist_agg:service_checklists(count),
          attachment_agg:service_attachments(count)
        `)
        .eq('board_id', boardId)
        .is('archived_at', null)
        .order('position_numeric', { ascending: true });

      if (cardsError) throw cardsError;

      // Fetch labels
      const { data: labels, error: labelsError } = await supabase
        .from('service_labels')
        .select('*')
        .eq('board_id', boardId);

      if (labelsError) throw labelsError;

      // Transform cards
      const transformedCards = (cards || []).map((card: any) => {
        const { card_labels, member_agg, comment_agg, checklist_agg, attachment_agg, ...rest } = card;
        return {
          ...rest,
          labels: card_labels?.map((cl: any) => cl.label).filter(Boolean) || [],
          member_count: member_agg?.[0]?.count || 0,
          comment_count: comment_agg?.[0]?.count || 0,
          checklist_count: checklist_agg?.[0]?.count || 0,
          attachment_count: attachment_agg?.[0]?.count || 0,
        } as ServiceCard;
      });

      return {
        board: board as ServiceBoard,
        lists: (lists || []) as ServiceList[],
        cards: transformedCards,
        labels: (labels || []) as ServiceLabel[],
      };
    },
    enabled: !!boardId,
    staleTime: 10000,
  });

  // Create list mutation
  const createListMutation = useMutation({
    mutationFn: async (input: CreateListInput) => {
      if (!tenantId) throw new Error('No tenant');

      // Get max position
      const existingLists = boardQuery.data?.lists || [];
      const maxPosition = existingLists.length > 0
        ? Math.max(...existingLists.map(l => l.position_numeric))
        : 0;

      const { data, error } = await supabase
        .from('service_lists')
        .insert({
          tenant_id: tenantId,
          board_id: input.board_id,
          name: input.name,
          position_numeric: input.position_numeric ?? maxPosition + 1000,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ServiceList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-board', boardId] });
    },
    onError: (error) => {
      console.error('Error creating list:', error);
      toast.error('Failed to create list');
    },
  });

  // Update list mutation
  const updateListMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceList> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ServiceList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-board', boardId] });
    },
  });

  // Create card mutation
  const createCardMutation = useMutation({
    mutationFn: async (input: CreateCardInput) => {
      if (!tenantId || !user?.id) throw new Error('No tenant or user');

      // Get max position in target list
      const existingCards = boardQuery.data?.cards.filter(c => c.list_id === input.list_id) || [];
      const maxPosition = existingCards.length > 0
        ? Math.max(...existingCards.map(c => c.position_numeric))
        : 0;

      const { data, error } = await supabase
        .from('service_cards')
        .insert({
          tenant_id: tenantId,
          board_id: input.board_id,
          list_id: input.list_id,
          title: input.title,
          description: input.description || null,
          priority: input.priority || 'medium',
          due_date: input.due_date || null,
          assigned_to: input.assigned_to || null,
          created_by: user.id,
          position_numeric: maxPosition + 1000,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('service_card_activity').insert({
        tenant_id: tenantId,
        card_id: data.id,
        user_id: user.id,
        event_type: 'card_created',
      });

      return data as ServiceCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-board', boardId] });
    },
    onError: (error) => {
      console.error('Error creating card:', error);
      toast.error('Failed to create card');
    },
  });

  // Move card mutation with optimistic update
  const moveCardMutation = useMutation({
    mutationFn: async (input: MoveCardInput) => {
      const { error } = await supabase
        .from('service_cards')
        .update({
          list_id: input.target_list_id,
          position_numeric: input.new_position,
        })
        .eq('id', input.card_id);

      if (error) throw error;
    },
    onMutate: async (input) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['service-board', boardId] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<BoardData>(['service-board', boardId]);

      // Optimistically update
      if (previousData) {
        const updatedCards = previousData.cards.map(card =>
          card.id === input.card_id
            ? { ...card, list_id: input.target_list_id, position_numeric: input.new_position }
            : card
        );
        queryClient.setQueryData(['service-board', boardId], {
          ...previousData,
          cards: updatedCards,
        });
      }

      return { previousData };
    },
    onError: (err, input, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['service-board', boardId], context.previousData);
      }
      toast.error('Failed to move card');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['service-board', boardId] });
    },
  });

  // Update card mutation
  const updateCardMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceCard> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ServiceCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-board', boardId] });
    },
  });

  // Delete card mutation
  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('service_cards')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-board', boardId] });
      toast.success('Card archived');
    },
  });

  // Get user's board role
  const roleQuery = useQuery({
    queryKey: ['service-board-role', boardId, user?.id],
    queryFn: async () => {
      if (!boardId || !user?.id) return null;

      const { data, error } = await supabase
        .from('service_board_members')
        .select('role')
        .eq('board_id', boardId)
        .eq('user_id', user.id)
        .single();

      if (error) return null;
      return data.role as 'owner' | 'admin' | 'member';
    },
    enabled: !!boardId && !!user?.id,
  });

  return {
    data: boardQuery.data,
    board: boardQuery.data?.board,
    lists: boardQuery.data?.lists || [],
    cards: boardQuery.data?.cards || [],
    labels: boardQuery.data?.labels || [],
    isLoading: boardQuery.isLoading,
    error: boardQuery.error,
    role: roleQuery.data,
    
    // Mutations
    createList: createListMutation.mutateAsync,
    updateList: updateListMutation.mutateAsync,
    createCard: createCardMutation.mutateAsync,
    moveCard: moveCardMutation.mutate,
    updateCard: updateCardMutation.mutateAsync,
    deleteCard: deleteCardMutation.mutateAsync,
    
    // Mutation states
    isCreatingList: createListMutation.isPending,
    isCreatingCard: createCardMutation.isPending,
    isMovingCard: moveCardMutation.isPending,
  };
}
