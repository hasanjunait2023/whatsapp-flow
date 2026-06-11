import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LegacySubscription {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_business_type_id: string | null;
  tenant_business_type_name: string | null;
  plan_id: string;
  plan_name: string;
  status: string;
  current_period_end: string;
  suggested_plan_id: string | null;
  suggested_plan_name: string | null;
}

export interface MigrationTarget {
  subscription_id: string;
  target_plan_id: string;
}

export interface BusinessTypePlan {
  id: string;
  name: string;
  tier: string;
  price_monthly: number;
  business_type_id: string;
}

export function usePlanMigration() {
  const [legacySubscriptions, setLegacySubscriptions] = useState<LegacySubscription[]>([]);
  const [businessTypePlans, setBusinessTypePlans] = useState<BusinessTypePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);

  const fetchLegacySubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      // Get all plans to identify legacy ones (those without business_type_id)
      const { data: legacyPlans, error: plansError } = await supabase
        .from('plans')
        .select('id, name')
        .is('business_type_id', null);

      if (plansError) throw plansError;

      const legacyPlanIds = (legacyPlans || []).map(p => p.id);

      if (legacyPlanIds.length === 0) {
        setLegacySubscriptions([]);
        setLoading(false);
        return;
      }

      // Get subscriptions on legacy plans
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          tenant_id,
          plan_id,
          status,
          current_period_end,
          tenant:tenants(
            name,
            business_type_id,
            business_type:business_types(name)
          ),
          plan:plans(name)
        `)
        .in('plan_id', legacyPlanIds);

      if (subsError) throw subsError;

      // Get new plans for suggestions
      const { data: newPlans, error: newPlansError } = await supabase
        .from('plans')
        .select('id, name, tier, price_monthly, business_type_id')
        .eq('is_active', true)
        .not('business_type_id', 'is', null)
        .order('tier_order', { ascending: true });

      if (newPlansError) throw newPlansError;

      setBusinessTypePlans(newPlans || []);

      // Map subscriptions with suggested plans
      const enriched: LegacySubscription[] = (subs || []).map((sub) => {
        const tenant = sub.tenant as any;
        const businessTypeId = tenant?.business_type_id;
        const businessTypeName = tenant?.business_type?.name;

        // Find best matching plan (starter tier for the tenant's business type)
        const suggestedPlan = businessTypeId
          ? (newPlans || []).find(
              (p) => p.business_type_id === businessTypeId && p.tier === 'starter'
            )
          : null;

        return {
          id: sub.id,
          tenant_id: sub.tenant_id,
          tenant_name: tenant?.name || 'Unknown',
          tenant_business_type_id: businessTypeId || null,
          tenant_business_type_name: businessTypeName || null,
          plan_id: sub.plan_id,
          plan_name: (sub.plan as any)?.name || 'Unknown',
          status: sub.status,
          current_period_end: sub.current_period_end,
          suggested_plan_id: suggestedPlan?.id || null,
          suggested_plan_name: suggestedPlan?.name || null,
        };
      });

      setLegacySubscriptions(enriched);
    } catch (err) {
      console.error('Error fetching legacy subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLegacySubscriptions();
  }, [fetchLegacySubscriptions]);

  const migrateSubscription = async (
    subscriptionId: string,
    targetPlanId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: targetPlanId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Migration error:', err);
      return false;
    }
  };

  const bulkMigrate = async (
    migrations: MigrationTarget[]
  ): Promise<{ success: number; failed: number }> => {
    setMigrating(true);
    let success = 0;
    let failed = 0;

    for (const migration of migrations) {
      const result = await migrateSubscription(
        migration.subscription_id,
        migration.target_plan_id
      );
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    await fetchLegacySubscriptions();
    setMigrating(false);

    return { success, failed };
  };

  const getPlansForBusinessType = (businessTypeId: string | null) => {
    if (!businessTypeId) return [];
    return businessTypePlans.filter((p) => p.business_type_id === businessTypeId);
  };

  return {
    legacySubscriptions,
    businessTypePlans,
    loading,
    migrating,
    refetch: fetchLegacySubscriptions,
    migrateSubscription,
    bulkMigrate,
    getPlansForBusinessType,
  };
}
