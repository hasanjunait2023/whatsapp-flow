import { useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useInstances } from '@/hooks/useInstances';
import { useTeam } from '@/hooks/useTeam';

interface ResourceLimit {
  current: number;
  max: number;
  remaining: number;
  canAdd: boolean;
  percentUsed: number;
  isAtLimit: boolean;
  isNearLimit: boolean; // 80%+
}

interface PlanLimits {
  instances: ResourceLimit;
  agents: ResourceLimit;
  messages: ResourceLimit;
  isLoading: boolean;
  hasHighUsage: boolean;
  hasLimitReached: boolean;
  planName: string | null;
}

function calculateLimit(current: number, max: number): ResourceLimit {
  const remaining = Math.max(0, max - current);
  const percentUsed = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  
  return {
    current,
    max,
    remaining,
    canAdd: current < max,
    percentUsed,
    isAtLimit: current >= max,
    isNearLimit: percentUsed >= 80,
  };
}

export function usePlanLimits(): PlanLimits {
  const { subscription, usage, loading: subLoading, plan } = useSubscription();
  const { instances, loading: instancesLoading } = useInstances();
  const { members, loading: teamLoading } = useTeam();

  const limits = useMemo(() => {
    const maxInstances = plan?.max_instances || 1;
    const maxAgents = plan?.max_agents || 1;
    const maxMessages = plan?.max_messages_per_month || 1000;
    
    const currentInstances = instances?.length || 0;
    const currentAgents = members?.length || 1;
    const currentMessages = usage?.messages_sent || 0;

    const instancesLimit = calculateLimit(currentInstances, maxInstances);
    const agentsLimit = calculateLimit(currentAgents, maxAgents);
    const messagesLimit = calculateLimit(currentMessages, maxMessages);

    const hasHighUsage = instancesLimit.isNearLimit || agentsLimit.isNearLimit || messagesLimit.isNearLimit;
    const hasLimitReached = instancesLimit.isAtLimit || agentsLimit.isAtLimit || messagesLimit.isAtLimit;

    return {
      instances: instancesLimit,
      agents: agentsLimit,
      messages: messagesLimit,
      hasHighUsage,
      hasLimitReached,
      planName: plan?.name || null,
    };
  }, [plan, instances, members, usage]);

  const isLoading = subLoading || instancesLoading || teamLoading;

  return {
    ...limits,
    isLoading,
  };
}

// Get usage color based on percentage
export function getUsageColor(percentUsed: number): 'default' | 'warning' | 'destructive' {
  if (percentUsed >= 90) return 'destructive';
  if (percentUsed >= 75) return 'warning';
  return 'default';
}

// Get progress bar color class based on percentage
export function getProgressColorClass(percentUsed: number): string {
  if (percentUsed >= 90) return 'bg-destructive';
  if (percentUsed >= 75) return 'bg-yellow-500';
  return 'bg-primary';
}
