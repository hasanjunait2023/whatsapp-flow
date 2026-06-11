import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';

export type SoulStatusValue =
  | 'none'
  | 'pending'
  | 'ingesting'
  | 'ready'
  | 'approved'
  | 'error';

export interface SoulBusinessProfile {
  name?: string;
  description?: string;
  category?: string;
}

export interface SoulTone {
  style?: string;
  formality?: string;
  emoji_usage?: string;
}

export interface SoulFaq {
  question: string;
  answer: string;
}

export interface SoulHours {
  schedule?: string;
  timezone?: string;
}

export interface SoulPolicies {
  shipping?: string;
  returns?: string;
  payment?: string;
}

export interface SoulSource {
  id: string;
  type: string;
  url?: string | null;
  status: string;
  error?: string | null;
}

export interface SoulStatus {
  status: SoulStatusValue;
  business_profile?: SoulBusinessProfile | null;
  tone?: SoulTone | null;
  products_summary?: string | null;
  faqs?: SoulFaq[] | null;
  hours?: SoulHours | null;
  policies?: SoulPolicies | null;
  languages?: string[] | null;
  error_message?: string | null;
  version?: number;
  sources?: SoulSource[];
}

export interface SoulIngestInput {
  websiteUrl?: string;
  includeFacebook?: boolean;
  facebookPageId?: string;
}

export interface SoulApproveInput {
  faqs?: SoulFaq[];
  tone?: SoulTone;
  policies?: SoulPolicies;
  products_summary?: string;
  hours?: SoulHours;
}

const POLL_INTERVAL_MS = 3000;

async function invokeSoul<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data as T;
}

export function useAgentSoul() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['agent-soul', currentTenant?.id];

  const statusQuery = useQuery<SoulStatus>({
    queryKey,
    enabled: !!currentTenant?.id,
    queryFn: () => invokeSoul<SoulStatus>('soul-status', {}),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' || status === 'ingesting' ? POLL_INTERVAL_MS : false;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const ingestMutation = useMutation({
    mutationFn: (input: SoulIngestInput) =>
      invokeSoul<{ soul_id: string; status: string }>('soul-ingest', input),
    onSuccess: () => {
      toast({
        title: 'Building your agent',
        description: 'We are reading your sources. This usually takes under a minute.',
      });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to start', description: error.message, variant: 'destructive' });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => invokeSoul<{ soul_id: string; status: string }>('soul-regenerate', {}),
    onSuccess: () => {
      toast({ title: 'Regenerating', description: 'Rebuilding the agent profile from your sources.' });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to regenerate', description: error.message, variant: 'destructive' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (edits: SoulApproveInput) => invokeSoul('soul-approve', edits),
    onSuccess: () => {
      toast({ title: 'Agent activated', description: 'Your AI persona is approved and live.' });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' });
    },
  });

  return {
    soul: statusQuery.data ?? null,
    isLoading: statusQuery.isLoading,
    ingest: ingestMutation.mutateAsync,
    isIngesting: ingestMutation.isPending,
    regenerate: regenerateMutation.mutateAsync,
    isRegenerating: regenerateMutation.isPending,
    approve: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    refetch: statusQuery.refetch,
  };
}
