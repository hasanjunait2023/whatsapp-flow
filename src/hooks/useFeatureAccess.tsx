import { useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

// All available feature flags
export const FEATURE_FLAGS = {
  orders_enabled: 'orders_enabled',
  products_enabled: 'products_enabled',
  automation_enabled: 'automation_enabled',
  workflows_enabled: 'workflows_enabled',
  analytics_enabled: 'analytics_enabled',
  team_enabled: 'team_enabled',
  ai_agent_enabled: 'ai_agent_enabled',
  quick_replies_enabled: 'quick_replies_enabled',
  invoice_generation: 'invoice_generation',
  woocommerce_sync: 'woocommerce_sync',
  contacts_enabled: 'contacts_enabled',
  followup_messages_enabled: 'followup_messages_enabled',
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

// Default features when no plan is available
const DEFAULT_FEATURES: Record<FeatureFlag, boolean> = {
  orders_enabled: true,
  products_enabled: true,
  automation_enabled: false,
  workflows_enabled: false,
  analytics_enabled: false,
  team_enabled: true,
  ai_agent_enabled: false,
  quick_replies_enabled: true,
  invoice_generation: false,
  woocommerce_sync: false,
  contacts_enabled: true,
  followup_messages_enabled: false,
};

interface UseFeatureAccessReturn {
  hasFeature: (feature: FeatureFlag) => boolean;
  features: Record<FeatureFlag, boolean>;
  loading: boolean;
}

export function useFeatureAccess(): UseFeatureAccessReturn {
  const { subscription, loading } = useSubscription();

  const features = useMemo(() => {
    if (!subscription) {
      return DEFAULT_FEATURES;
    }

    // Get plan features (from the plan's features JSONB column)
    const planFeatures = (subscription as any).plan?.features || {};
    
    // Get subscription-level overrides
    const overrides = (subscription as any).feature_overrides || {};

    // Merge: defaults <- plan features <- overrides
    const merged = { ...DEFAULT_FEATURES };
    
    Object.keys(DEFAULT_FEATURES).forEach((key) => {
      const featureKey = key as FeatureFlag;
      // Apply plan features
      if (planFeatures[featureKey] !== undefined) {
        merged[featureKey] = planFeatures[featureKey];
      }
      // Apply subscription overrides (highest priority)
      if (overrides[featureKey] !== undefined) {
        merged[featureKey] = overrides[featureKey];
      }
    });

    return merged;
  }, [subscription]);

  const hasFeature = (feature: FeatureFlag): boolean => {
    return features[feature] ?? false;
  };

  return {
    hasFeature,
    features,
    loading,
  };
}

// Convenience hook for single feature check
export function useHasFeature(feature: FeatureFlag): boolean {
  const { hasFeature } = useFeatureAccess();
  return hasFeature(feature);
}
