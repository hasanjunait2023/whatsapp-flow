import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { getCustomerStatusLabel, CustomerStatusLabel, CustomerData } from '@/lib/customer-status-config';

interface ContactStatusData {
  contact_id: string;
  tenant_id: string;
  business_type: string | null;
  total_orders: number;
  total_spent: number;
  score_tier: string | null;
  days_since_last_order: number | null;
}

interface UseContactCustomerStatusResult {
  statusMap: Record<string, CustomerStatusLabel | null>;
  loading: boolean;
  businessType: string | null;
}

export function useContactCustomerStatus(contactIds: string[]): UseContactCustomerStatusResult {
  const { currentTenant } = useTenant();
  const [statusData, setStatusData] = useState<ContactStatusData[]>([]);
  const [loading, setLoading] = useState(false);
  const [businessType, setBusinessType] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatusData = async () => {
      if (!contactIds.length || !currentTenant?.id) {
        setStatusData([]);
        return;
      }

      setLoading(true);
      try {
        // Fetch customer status data from the view
        const { data, error } = await supabase
          .from('contact_customer_status')
          .select('*')
          .in('contact_id', contactIds)
          .eq('tenant_id', currentTenant.id);

        if (error) {
          console.error('Error fetching customer status:', error);
          setStatusData([]);
          return;
        }

        setStatusData((data as ContactStatusData[]) || []);
        
        // Set business type from first result or tenant
        if (data && data.length > 0 && data[0].business_type) {
          setBusinessType(data[0].business_type);
        }
      } catch (err) {
        console.error('Error in useContactCustomerStatus:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatusData();
  }, [contactIds.join(','), currentTenant?.id]);

  // Fetch business type separately if not available from status data
  useEffect(() => {
    const fetchBusinessType = async () => {
      if (businessType || !currentTenant?.business_type_id) return;

      const { data } = await supabase
        .from('business_types')
        .select('slug')
        .eq('id', currentTenant.business_type_id)
        .single();

      if (data?.slug) {
        setBusinessType(data.slug);
      }
    };

    fetchBusinessType();
  }, [currentTenant?.business_type_id, businessType]);

  // Build the status map
  const statusMap = useMemo(() => {
    const map: Record<string, CustomerStatusLabel | null> = {};

    contactIds.forEach((id) => {
      const data = statusData.find((d) => d.contact_id === id);
      
      if (!data) {
        map[id] = null;
        return;
      }

      const customerData: CustomerData = {
        totalOrders: data.total_orders || 0,
        totalSpent: data.total_spent || 0,
        scoreTier: data.score_tier,
        daysSinceLastOrder: data.days_since_last_order,
        subscriptionStatus: null, // Will be handled separately for service businesses
      };

      map[id] = getCustomerStatusLabel(data.business_type || businessType, customerData);
    });

    return map;
  }, [statusData, contactIds, businessType]);

  return { statusMap, loading, businessType };
}

// Hook for Admin inbox - fetches tenant subscription status for contacts
export function useAdminContactStatus(contactPhones: string[]): Record<string, CustomerStatusLabel | null> {
  const [statusMap, setStatusMap] = useState<Record<string, CustomerStatusLabel | null>>({});

  useEffect(() => {
    const fetchTenantStatuses = async () => {
      if (!contactPhones.length) {
        setStatusMap({});
        return;
      }

      try {
        // Match phone numbers to profiles and get their tenant subscription status
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, phone_number')
          .not('phone_number', 'is', null);

        if (!profiles?.length) {
          setStatusMap({});
          return;
        }

        // Find matching profiles by phone number (partial match)
        const phoneToProfileId: Record<string, string> = {};
        contactPhones.forEach((phone) => {
          const cleanPhone = phone.replace(/\D/g, '');
          const match = profiles.find((p) => {
            const profilePhone = (p.phone_number || '').replace(/\D/g, '');
            return profilePhone.endsWith(cleanPhone) || cleanPhone.endsWith(profilePhone);
          });
          if (match) {
            phoneToProfileId[phone] = match.id;
          }
        });

        const profileIds = Object.values(phoneToProfileId);
        if (!profileIds.length) {
          setStatusMap({});
          return;
        }

        // Get tenants owned by these profiles
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, owner_id')
          .in('owner_id', profileIds);

        if (!tenants?.length) {
          setStatusMap({});
          return;
        }

        const tenantIds = tenants.map((t) => t.id);
        const ownerToTenantId: Record<string, string> = {};
        tenants.forEach((t) => {
          if (t.owner_id) ownerToTenantId[t.owner_id] = t.id;
        });

        // Get subscriptions for these tenants
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('tenant_id, status')
          .in('tenant_id', tenantIds);

        const tenantToStatus: Record<string, string> = {};
        subscriptions?.forEach((s) => {
          tenantToStatus[s.tenant_id] = s.status;
        });

        // Build the final status map
        const { getTenantStatusLabel } = await import('@/lib/customer-status-config');
        const newStatusMap: Record<string, CustomerStatusLabel | null> = {};

        contactPhones.forEach((phone) => {
          const profileId = phoneToProfileId[phone];
          if (!profileId) {
            newStatusMap[phone] = null;
            return;
          }

          const tenantId = ownerToTenantId[profileId];
          if (!tenantId) {
            newStatusMap[phone] = null;
            return;
          }

          const status = tenantToStatus[tenantId] || null;
          newStatusMap[phone] = getTenantStatusLabel(status);
        });

        setStatusMap(newStatusMap);
      } catch (err) {
        console.error('Error fetching admin contact status:', err);
        setStatusMap({});
      }
    };

    fetchTenantStatuses();
  }, [contactPhones.join(',')]);

  return statusMap;
}
