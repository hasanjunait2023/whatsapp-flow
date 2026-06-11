import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCallback } from 'react';
import { Json } from '@/integrations/supabase/types';

export type AuditAction = 
  | 'bulk_activate'
  | 'bulk_suspend'
  | 'bulk_cancel'
  | 'bulk_delete'
  | 'bulk_change_plan'
  | 'bulk_extend'
  | 'activate'
  | 'suspend'
  | 'cancel'
  | 'delete'
  | 'change_plan'
  | 'extend'
  | 'impersonate'
  | 'verify_payment'
  | 'create'
  | 'update';

export type EntityType = 'tenant' | 'subscription' | 'payment' | 'plan' | 'user' | 'instance';

interface AuditLogDetails {
  affected_ids?: string[];
  affected_count?: number;
  old_value?: string | number | boolean | null;
  new_value?: string | number | boolean | null;
  plan_id?: string;
  plan_name?: string;
  days?: number;
  status?: string;
  [key: string]: unknown;
}

export function useAuditLog() {
  const { user } = useAuth();

  const logAction = useCallback(
    async (
      action: AuditAction,
      entityType: EntityType,
      entityId: string | null,
      details?: AuditLogDetails
    ) => {
      if (!user) {
        console.warn('Cannot log audit action: no user');
        return;
      }

      try {
        const { error } = await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details: details as Json,
        });

        if (error) {
          console.error('Failed to log audit action:', error);
        }
      } catch (err) {
        console.error('Exception logging audit action:', err);
      }
    },
    [user]
  );

  const logBulkAction = useCallback(
    async (
      action: AuditAction,
      entityType: EntityType,
      affectedIds: string[],
      details?: Omit<AuditLogDetails, 'affected_ids' | 'affected_count'>
    ) => {
      await logAction(action, entityType, null, {
        ...details,
        affected_ids: affectedIds,
        affected_count: affectedIds.length,
      });
    },
    [logAction]
  );

  return { logAction, logBulkAction };
}
