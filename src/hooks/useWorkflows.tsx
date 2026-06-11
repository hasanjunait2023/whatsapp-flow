import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_type: 'trigger' | 'condition' | 'action' | 'delay';
  node_subtype: string | null;
  node_config: Record<string, any>;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string | null;
  target_handle: string | null;
  label: string | null;
  created_at: string;
}

export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config?: Record<string, any>;
}

export function useWorkflows() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows((data || []) as Workflow[]);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      toast({
        title: 'Error',
        description: 'Failed to load workflows',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, toast]);

  useEffect(() => {
    if (currentTenant) {
      fetchWorkflows();
    }
  }, [currentTenant?.id, fetchWorkflows]);

  const createWorkflow = async (input: CreateWorkflowInput): Promise<Workflow | null> => {
    if (!currentTenant) return null;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          tenant_id: currentTenant.id,
          name: input.name,
          description: input.description || null,
          trigger_type: input.trigger_type,
          trigger_config: input.trigger_config || {},
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      const workflow = data as Workflow;
      setWorkflows((prev) => [workflow, ...prev]);
      toast({ title: 'Workflow created', description: `"${workflow.name}" is ready to edit.` });
      return workflow;
    } catch (err) {
      console.error('Error creating workflow:', err);
      toast({ title: 'Error', description: 'Failed to create workflow', variant: 'destructive' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateWorkflow = async (id: string, updates: Partial<Workflow>): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
      );
      return true;
    } catch (err) {
      console.error('Error updating workflow:', err);
      toast({ title: 'Error', description: 'Failed to update workflow', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkflow = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('workflows').delete().eq('id', id);
      if (error) throw error;

      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toast({ title: 'Workflow deleted' });
      return true;
    } catch (err) {
      console.error('Error deleting workflow:', err);
      toast({ title: 'Error', description: 'Failed to delete workflow', variant: 'destructive' });
      return false;
    }
  };

  const toggleWorkflow = async (id: string, isActive: boolean): Promise<boolean> => {
    return updateWorkflow(id, { is_active: isActive });
  };

  const fetchWorkflowWithDetails = async (id: string): Promise<Workflow | null> => {
    try {
      const [workflowRes, nodesRes, edgesRes] = await Promise.all([
        supabase.from('workflows').select('*').eq('id', id).single(),
        supabase.from('workflow_nodes').select('*').eq('workflow_id', id),
        supabase.from('workflow_edges').select('*').eq('workflow_id', id),
      ]);

      if (workflowRes.error) throw workflowRes.error;

      return {
        ...(workflowRes.data as Workflow),
        nodes: (nodesRes.data || []) as WorkflowNode[],
        edges: (edgesRes.data || []) as WorkflowEdge[],
      };
    } catch (err) {
      console.error('Error fetching workflow details:', err);
      return null;
    }
  };

  const saveWorkflowNodes = async (
    workflowId: string,
    nodes: Omit<WorkflowNode, 'id' | 'workflow_id' | 'created_at'>[],
    edges: Omit<WorkflowEdge, 'id' | 'workflow_id' | 'created_at'>[]
  ): Promise<boolean> => {
    setSaving(true);
    try {
      // Delete existing nodes and edges
      await supabase.from('workflow_edges').delete().eq('workflow_id', workflowId);
      await supabase.from('workflow_nodes').delete().eq('workflow_id', workflowId);

      // Insert new nodes
      if (nodes.length > 0) {
        const nodeInserts = nodes.map((n) => ({
          ...n,
          workflow_id: workflowId,
        }));
        const { data: insertedNodes, error: nodesError } = await supabase
          .from('workflow_nodes')
          .insert(nodeInserts)
          .select();

        if (nodesError) throw nodesError;

        // Create a map from temp IDs to real IDs
        const nodeIdMap = new Map<string, string>();
        nodes.forEach((n, i) => {
          if (insertedNodes?.[i]) {
            nodeIdMap.set((n as any).temp_id || n.node_subtype + i, insertedNodes[i].id);
          }
        });

        // Insert edges with mapped IDs
        if (edges.length > 0) {
          const edgeInserts = edges.map((e) => ({
            workflow_id: workflowId,
            source_node_id: e.source_node_id,
            target_node_id: e.target_node_id,
            source_handle: e.source_handle,
            target_handle: e.target_handle,
            label: e.label,
          }));

          const { error: edgesError } = await supabase.from('workflow_edges').insert(edgeInserts);
          if (edgesError) throw edgesError;
        }
      }

      toast({ title: 'Workflow saved', description: 'Changes have been saved.' });
      return true;
    } catch (err) {
      console.error('Error saving workflow:', err);
      toast({ title: 'Error', description: 'Failed to save workflow', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    workflows,
    loading,
    saving,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    fetchWorkflowWithDetails,
    saveWorkflowNodes,
    refetch: fetchWorkflows,
  };
}
