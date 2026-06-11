import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  tenant_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Type assertion since we know the structure
      const typedData = (data || []) as unknown as AdminNotification[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter((n) => !n.is_read).length);
    } catch (err: any) {
      console.error('Error fetching admin notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      toast({
        title: 'Done',
        description: 'All notifications marked as read',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to mark all as read',
        variant: 'destructive',
      });
    }
  };

  const getWorkflowErrors = () => {
    return notifications.filter((n) => n.type === 'workflow_error');
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const newNotification = payload.new as AdminNotification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((c) => c + 1);

          // Show toast for workflow errors
          if (newNotification.type === 'workflow_error') {
            toast({
              title: '⚠️ Workflow Error',
              description: newNotification.title,
              variant: 'destructive',
            });
          }
          
          // Show toast for instance events
          if (newNotification.type === 'instance_disconnected') {
            toast({
              title: '📵 Instance Disconnected',
              description: newNotification.title,
              variant: 'destructive',
            });
          }
          
          if (newNotification.type === 'instance_deleted') {
            toast({
              title: '🗑️ Instance Deleted',
              description: newNotification.title,
            });
          }
          
          if (newNotification.type === 'instance_banned') {
            toast({
              title: '🚫 Instance Banned',
              description: newNotification.title,
              variant: 'destructive',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, toast]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    getWorkflowErrors,
    refresh: fetchNotifications,
  };
}
