import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: 'new_message' | 'keyword_match';
  trigger_config: {
    keywords?: string[];
    match_type?: 'contains' | 'exact' | 'starts_with';
    case_sensitive?: boolean;
  };
  action_type: 'auto_reply' | 'assign_agent';
  action_config: {
    reply_message?: string;
    agent_id?: string;
  };
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationRuleInput {
  name: string;
  description?: string;
  is_active?: boolean;
  trigger_type: 'new_message' | 'keyword_match';
  trigger_config: Record<string, any>;
  action_type: 'auto_reply' | 'assign_agent';
  action_config: Record<string, any>;
  priority?: number;
}

export function useAutomationRules() {
  const { currentTenant } = useTenant();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRules = useCallback(async () => {
    if (!currentTenant?.id) {
      setRules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(rule => ({
        ...rule,
        trigger_type: rule.trigger_type as 'new_message' | 'keyword_match',
        action_type: rule.action_type as 'auto_reply' | 'assign_agent',
        trigger_config: rule.trigger_config as AutomationRule['trigger_config'],
        action_config: rule.action_config as AutomationRule['action_config'],
      }));
      
      setRules(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching automation rules:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch rules'));
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const createRule = async (input: CreateAutomationRuleInput): Promise<AutomationRule | null> => {
    if (!currentTenant?.id) return null;

    try {
      const { data, error: createError } = await supabase
        .from('automation_rules')
        .insert({
          tenant_id: currentTenant.id,
          ...input,
        })
        .select()
        .single();

      if (createError) throw createError;
      
      const newRule = {
        ...data,
        trigger_type: data.trigger_type as 'new_message' | 'keyword_match',
        action_type: data.action_type as 'auto_reply' | 'assign_agent',
        trigger_config: data.trigger_config as AutomationRule['trigger_config'],
        action_config: data.action_config as AutomationRule['action_config'],
      };
      
      setRules(prev => [newRule, ...prev]);
      return newRule;
    } catch (err) {
      console.error('Error creating automation rule:', err);
      throw err;
    }
  };

  const updateRule = async (id: string, updates: Partial<CreateAutomationRuleInput>): Promise<AutomationRule | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('automation_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      const updatedRule = {
        ...data,
        trigger_type: data.trigger_type as 'new_message' | 'keyword_match',
        action_type: data.action_type as 'auto_reply' | 'assign_agent',
        trigger_config: data.trigger_config as AutomationRule['trigger_config'],
        action_config: data.action_config as AutomationRule['action_config'],
      };
      
      setRules(prev => prev.map(r => r.id === id ? updatedRule : r));
      return updatedRule;
    } catch (err) {
      console.error('Error updating automation rule:', err);
      throw err;
    }
  };

  const deleteRule = async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting automation rule:', err);
      throw err;
    }
  };

  const toggleRule = async (id: string, is_active: boolean): Promise<void> => {
    await updateRule(id, { is_active });
  };

  return {
    rules,
    loading,
    error,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    refetch: fetchRules,
  };
}
