import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface InAppNotification {
  id: string;
  tenant_id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type NotificationFilterType = 'all' | 'unread' | 'orders' | 'complaints' | 'system' | 'instance';
export type NotificationDateRange = 'today' | '7days' | '30days' | 'all';

export interface NotificationFilters {
  type: NotificationFilterType;
  search: string;
  dateRange: NotificationDateRange;
}

const typeToNotificationTypes: Record<NotificationFilterType, string[]> = {
  all: [],
  unread: [],
  orders: ['new_order', 'order_status'],
  complaints: ['new_complaint', 'complaint_resolved'],
  system: ['subscription_expiring', 'subscription_expired', 'payment_received', 'team_member_added', 'low_message_quota', 'system'],
  instance: ['instance_disconnected', 'instance_deleted', 'instance_banned'],
};

export function useRealtimeNotifications(filters?: NotificationFilters) {
  const { currentTenant } = useTenantContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;
  const userId = user?.id;

  // Fetch notifications with filters
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['in-app-notifications', tenantId, userId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('in_app_notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Get notifications for this user or broadcast notifications
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);

      // Apply type filter
      if (filters?.type && filters.type !== 'all') {
        if (filters.type === 'unread') {
          query = query.eq('is_read', false);
        } else {
          const types = typeToNotificationTypes[filters.type];
          if (types.length > 0) {
            query = query.in('type', types);
          }
        }
      }

      // Apply search filter
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
      }

      // Apply date range filter
      if (filters?.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return (data || []) as InAppNotification[];
    },
    enabled: !!tenantId && !!userId,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications', tenantId, userId] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;

      const { error } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('is_read', false)
        .or(`user_id.is.null,user_id.eq.${userId}`);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications', tenantId, userId] });
      toast({ title: 'All notifications marked as read' });
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('in_app_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications', tenantId, userId] });
      toast({ title: 'Notification deleted' });
    },
  });

  // Delete all read notifications
  const deleteAllRead = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;

      const { error } = await supabase
        .from('in_app_notifications')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('is_read', true)
        .or(`user_id.is.null,user_id.eq.${userId}`);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications', tenantId, userId] });
      toast({ title: 'All read notifications deleted' });
    },
  });

  // Show toast for new notification
  const showNotificationToast = useCallback((notification: InAppNotification) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'new_order':
        case 'order_status':
          return '🛒';
        case 'new_message':
          return '💬';
        case 'new_complaint':
        case 'complaint_resolved':
          return '⚠️';
        case 'instance_disconnected':
          return '📵';
        case 'instance_deleted':
          return '🗑️';
        case 'instance_banned':
          return '🚫';
        case 'subscription_expired':
        case 'subscription_expiring':
          return '⏰';
        case 'payment_received':
          return '💳';
        case 'team_member_added':
          return '👤';
        default:
          return '🔔';
      }
    };

    toast({
      title: `${getIcon()} ${notification.title}`,
      description: notification.message || undefined,
    });
  }, [toast]);

  // Real-time subscription
  useEffect(() => {
    if (!tenantId || !userId) return;

    const channel = supabase
      .channel('in_app_notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newNotification = payload.new as InAppNotification;
          
          // Only show if it's for this user or broadcast
          if (newNotification.user_id === null || newNotification.user_id === userId) {
            // Show toast
            showNotificationToast(newNotification);
            
            // Invalidate query to refresh list
            queryClient.invalidateQueries({ queryKey: ['in-app-notifications', tenantId, userId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, userId, queryClient, showNotificationToast]);

  return {
    notifications,
    unreadCount,
    loading: isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  };
}
