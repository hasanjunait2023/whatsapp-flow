import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessType {
  id: string;
  slug: string;
  name: string;
  name_bn: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessTypeFeature {
  id: string;
  business_type_id: string;
  feature_key: string;
  feature_label: string;
  feature_label_bn: string | null;
  feature_description: string | null;
  icon: string | null;
  is_core: boolean;
  min_tier: 'starter' | 'growth' | 'pro';
  display_order: number;
  created_at: string;
}

export function useBusinessTypes() {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [features, setFeatures] = useState<BusinessTypeFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBusinessTypes = useCallback(async () => {
    try {
      setLoading(true);
      
      const [typesResult, featuresResult] = await Promise.all([
        supabase
          .from('business_types')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('business_type_features')
          .select('*')
          .order('display_order', { ascending: true }),
      ]);

      if (typesResult.error) throw typesResult.error;
      if (featuresResult.error) throw featuresResult.error;

      setBusinessTypes(typesResult.data || []);
      setFeatures(featuresResult.data as BusinessTypeFeature[] || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching business types:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch business types'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinessTypes();
  }, [fetchBusinessTypes]);

  const getFeaturesForType = useCallback(
    (businessTypeId: string) => {
      return features.filter((f) => f.business_type_id === businessTypeId);
    },
    [features]
  );

  const getFeaturesForTier = useCallback(
    (businessTypeId: string, tier: 'starter' | 'growth' | 'pro') => {
      const tierOrder = { starter: 1, growth: 2, pro: 3 };
      const currentTierOrder = tierOrder[tier];

      return features.filter(
        (f) =>
          f.business_type_id === businessTypeId &&
          tierOrder[f.min_tier] <= currentTierOrder
      );
    },
    [features]
  );

  const getBusinessTypeBySlug = useCallback(
    (slug: string) => {
      return businessTypes.find((bt) => bt.slug === slug);
    },
    [businessTypes]
  );

  return {
    businessTypes,
    features,
    loading,
    error,
    refetch: fetchBusinessTypes,
    getFeaturesForType,
    getFeaturesForTier,
    getBusinessTypeBySlug,
  };
}
