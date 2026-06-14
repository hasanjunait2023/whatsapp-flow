import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SendBulkInput {
  contactIds: string[];
  content: string;
  instanceId?: string;
}

interface SendBulkResult {
  success: true;
  queued: number;
  total: number;
}

/**
 * Queues a personalized bulk broadcast via the `send-bulk-reminder` edge fn.
 * The backend drips + renders per recipient and skips opted-out contacts.
 */
export function useSendBulkMessage() {
  return useMutation<SendBulkResult, Error, SendBulkInput>({
    mutationFn: async ({ contactIds, content, instanceId }) => {
      const { data, error } = await supabase.functions.invoke('send-bulk-reminder', {
        body: {
          contact_ids: contactIds,
          content,
          ...(instanceId ? { instance_id: instanceId } : {}),
        },
      });

      if (error) throw new Error(error.message || 'Failed to queue broadcast');
      if (!data?.success) throw new Error(data?.error || 'Failed to queue broadcast');

      return data as SendBulkResult;
    },
  });
}
