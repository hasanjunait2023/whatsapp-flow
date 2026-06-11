import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_by: string | null;
  related_ticket_id: string | null;
  related_tenant_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assignee_email?: string;
  assigner_name?: string;
}

export function useAdminTasks() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: taskData, error } = await supabase
        .from('admin_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set([
        ...(taskData?.filter(t => t.assigned_to).map(t => t.assigned_to) || []),
        ...(taskData?.filter(t => t.assigned_by).map(t => t.assigned_by) || [])
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds.length > 0 ? userIds : ['']);

      const enrichedTasks: AdminTask[] = (taskData || []).map(task => ({
        ...task,
        assignee_name: profiles?.find(p => p.id === task.assigned_to)?.full_name,
        assignee_email: profiles?.find(p => p.id === task.assigned_to)?.email,
        assigner_name: profiles?.find(p => p.id === task.assigned_by)?.full_name,
      }));

      setTasks(enrichedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createTask = async (taskData: {
    title: string;
    description?: string;
    priority?: string;
    assigned_to?: string;
    related_ticket_id?: string;
    related_tenant_id?: string;
    due_date?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('admin_tasks')
        .insert({
          ...taskData,
          assigned_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Task Created',
        description: 'New task has been created',
      });

      await fetchTasks();
      return data;
    } catch (err) {
      console.error('Error creating task:', err);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<AdminTask>) => {
    try {
      const { error } = await supabase
        .from('admin_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Task Updated',
        description: 'The task has been updated',
      });

      await fetchTasks();
    } catch (err) {
      console.error('Error updating task:', err);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    const updates: Partial<AdminTask> = { status };
    if (status === 'done') {
      updates.completed_at = new Date().toISOString();
    }
    await updateTask(taskId, updates);
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('admin_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Task Deleted',
        description: 'The task has been deleted',
      });

      await fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  };
}
