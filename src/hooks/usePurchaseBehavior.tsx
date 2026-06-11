import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface CourierStats {
  total: number;
  success: number;
  cancel: number;
  return: number;
}

export interface PurchaseBehavior {
  phoneNumber: string;
  riskLevel: 'low' | 'medium' | 'high';
  customerRating: number | null;
  totalDeliveries: number;
  successfulDeliveries: number;
  cancelledDeliveries: number;
  returnedDeliveries: number;
  successRate: number;
  courierBreakdown: Record<string, CourierStats>;
  isNewCustomer: boolean;
  checkedAt?: string;
}

export interface PurchaseBehaviorCheck {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  phone_number: string;
  risk_level: string | null;
  customer_rating: number | null;
  total_deliveries: number;
  successful_deliveries: number;
  cancelled_deliveries: number;
  returned_deliveries: number;
  courier_stats: unknown;
  checked_at: string;
  checked_by: string | null;
}

export function usePurchaseBehavior(contactId?: string, phoneNumber?: string, explicitTenantId?: string) {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Use explicit tenantId if provided, otherwise fall back to currentTenant
  const tenantId = explicitTenantId || currentTenant?.id;

  // Get cached behavior check for a contact/phone
  const { data: cachedBehavior, isLoading: isLoadingCached } = useQuery({
    queryKey: ['purchase-behavior', tenantId, contactId, phoneNumber],
    queryFn: async () => {
      if (!tenantId || (!contactId && !phoneNumber)) return null;

      let query = supabase
        .from('purchase_behavior_checks')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('checked_at', { ascending: false })
        .limit(1);

      if (contactId) {
        query = query.eq('contact_id', contactId);
      } else if (phoneNumber) {
        query = query.eq('phone_number', formatPhoneForQuery(phoneNumber));
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data as PurchaseBehaviorCheck | null;
    },
    enabled: !!tenantId && (!!contactId || !!phoneNumber),
  });

  // Check purchase behavior (calls the edge function)
  const checkBehavior = useMutation({
    mutationFn: async ({ phone, contactId: cId, forceRefresh = false }: {
      phone: string;
      contactId?: string;
      forceRefresh?: boolean;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('bdcourier-check', {
        body: {
          phoneNumber: phone,
          tenantId,
          contactId: cId,
          forceRefresh,
        },
      });

      if (response.error) throw new Error(response.error.message);
      
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Failed to check behavior');

      return result.data as PurchaseBehavior;
    },
    onSuccess: (data, variables) => {
      // Invalidate cached behavior queries
      queryClient.invalidateQueries({ queryKey: ['purchase-behavior', tenantId] });
      
      toast({
        title: 'Behavior check complete',
        description: `Risk level: ${data.riskLevel.toUpperCase()} | ${data.totalDeliveries} total deliveries`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Check failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get behavior history for a contact
  const { data: behaviorHistory = [] } = useQuery({
    queryKey: ['purchase-behavior-history', tenantId, contactId],
    queryFn: async () => {
      if (!tenantId || !contactId) return [];

      const { data, error } = await supabase
        .from('purchase_behavior_checks')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .order('checked_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as PurchaseBehaviorCheck[];
    },
    enabled: !!tenantId && !!contactId,
  });

  return {
    cachedBehavior,
    isLoadingCached,
    checkBehavior,
    behaviorHistory,
  };
}

// Helper to format phone for database queries
function formatPhoneForQuery(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('880')) {
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    return '880' + cleaned.substring(1);
  } else if (cleaned.length === 10) {
    return '880' + cleaned;
  }
  
  return cleaned;
}

// Utility function to get risk level color
export function getRiskLevelColor(level: string | null | undefined): string {
  switch (level) {
    case 'low':
      return 'text-green-600 bg-green-100 border-green-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'high':
      return 'text-red-600 bg-red-100 border-red-200';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
}

// Utility function to get risk level badge variant
export function getRiskLevelVariant(level: string | null | undefined): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level) {
    case 'low':
      return 'default';
    case 'medium':
      return 'secondary';
    case 'high':
      return 'destructive';
    default:
      return 'outline';
  }
}
