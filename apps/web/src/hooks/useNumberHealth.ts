import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

/** Warm-up lifecycle phase reported by the backend. */
export type WarmupPhase = 'new' | 'warming' | 'ramp' | 'ready';

/** Ban-risk health bucket reported by the backend. */
export type NumberHealthStatus = 'good' | 'watch' | 'at_risk';

export interface NumberHealthInstance {
  instance_id: string;
  name: string | null;
  phone_number: string | null;
  status: string;
  warmup_phase: WarmupPhase;
  warmup_day: number;
  daily_cap: number;
  sent_7d: number;
  received_7d: number;
  /** Reply rate as a fraction in the range 0..1. */
  reply_rate: number;
  sent_today: number;
  health: NumberHealthStatus;
}

export interface NumberHealthData {
  instances: NumberHealthInstance[];
  opted_out_count: number;
}

interface UseNumberHealthOptions {
  /** Optionally scope the report to a single instance. */
  instanceId?: string;
}

/**
 * Reads the per-number ban-risk / warm-up report from the `number-health`
 * function endpoint. Mirrors the existing fn-call pattern used across the app
 * (`supabase.functions.invoke`, see useSendMessage / useInstanceQR) and is
 * tenant-scoped via the query key so cached data never leaks across workspaces.
 */
export function useNumberHealth({ instanceId }: UseNumberHealthOptions = {}) {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  return useQuery<NumberHealthData>({
    queryKey: ['number-health', tenantId, instanceId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('number-health', {
        body: instanceId ? { instance_id: instanceId } : {},
      });

      if (error) {
        throw new Error(error.message || 'Failed to load number health');
      }

      return {
        instances: data?.instances ?? [],
        opted_out_count: data?.opted_out_count ?? 0,
      };
    },
    enabled: !!tenantId,
  });
}
