import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FEATURE_FLAGS, FeatureFlag } from '@/hooks/useFeatureAccess';

export interface FeatureCategory {
  id: string;
  name: string;
  name_bn: string | null;
  icon: string | null;
  display_order: number;
}

export interface FeatureTemplate {
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
  category_id: string | null;
  feature_flag_key: string | null;
  is_highlight: boolean;
  tooltip: string | null;
  category?: FeatureCategory;
}

export type TierLevel = 'starter' | 'growth' | 'pro';

const TIER_ORDER: Record<TierLevel, number> = {
  starter: 1,
  growth: 2,
  pro: 3,
};

export function useFeatureTemplates() {
  const [categories, setCategories] = useState<FeatureCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all feature categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('feature_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setCategories(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching feature categories:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch categories'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get template features for a business type and tier
  const getTemplateForTier = useCallback(
    async (businessTypeId: string, tier: TierLevel): Promise<Record<FeatureFlag, boolean>> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('business_type_features')
          .select('*')
          .eq('business_type_id', businessTypeId);

        if (fetchError) throw fetchError;

        const currentTierOrder = TIER_ORDER[tier];
        const result: Partial<Record<FeatureFlag, boolean>> = {};

        // Initialize all feature flags to false
        Object.keys(FEATURE_FLAGS).forEach((key) => {
          result[key as FeatureFlag] = false;
        });

        // Enable features based on tier
        (data || []).forEach((feature) => {
          const featureTierOrder = TIER_ORDER[feature.min_tier as TierLevel] || 1;
          if (featureTierOrder <= currentTierOrder && feature.feature_flag_key) {
            const flagKey = feature.feature_flag_key as FeatureFlag;
            if (flagKey in FEATURE_FLAGS) {
              result[flagKey] = true;
            }
          }
        });

        return result as Record<FeatureFlag, boolean>;
      } catch (err) {
        console.error('Error getting template for tier:', err);
        throw err;
      }
    },
    []
  );

  // Apply template to a specific plan
  const applyTemplateToPlan = useCallback(
    async (planId: string, businessTypeId: string, tier: TierLevel): Promise<void> => {
      try {
        const features = await getTemplateForTier(businessTypeId, tier);
        
        const { error: updateError } = await supabase
          .from('plans')
          .update({ features })
          .eq('id', planId);

        if (updateError) throw updateError;
      } catch (err) {
        console.error('Error applying template to plan:', err);
        throw err;
      }
    },
    [getTemplateForTier]
  );

  // Sync all plans of a business type with their templates
  const syncPlansWithTemplates = useCallback(
    async (businessTypeId: string): Promise<number> => {
      try {
        const { data: plans, error: plansError } = await supabase
          .from('plans')
          .select('id, tier')
          .eq('business_type_id', businessTypeId);

        if (plansError) throw plansError;

        let syncedCount = 0;
        for (const plan of plans || []) {
          if (plan.tier) {
            await applyTemplateToPlan(plan.id, businessTypeId, plan.tier as TierLevel);
            syncedCount++;
          }
        }

        return syncedCount;
      } catch (err) {
        console.error('Error syncing plans with templates:', err);
        throw err;
      }
    },
    [applyTemplateToPlan]
  );

  // Update a feature template
  const updateFeature = useCallback(
    async (
      featureId: string,
      updates: Partial<Pick<FeatureTemplate, 'min_tier' | 'is_highlight' | 'feature_flag_key' | 'tooltip' | 'category_id' | 'feature_label' | 'feature_label_bn' | 'feature_description' | 'icon' | 'is_core'>>
    ): Promise<void> => {
      try {
        const { error: updateError } = await supabase
          .from('business_type_features')
          .update(updates)
          .eq('id', featureId);

        if (updateError) throw updateError;
      } catch (err) {
        console.error('Error updating feature:', err);
        throw err;
      }
    },
    []
  );

  // Create a new feature template
  const createFeature = useCallback(
    async (
      feature: Omit<FeatureTemplate, 'id' | 'category'>
    ): Promise<FeatureTemplate | null> => {
      try {
        const { data, error: insertError } = await supabase
          .from('business_type_features')
          .insert([feature])
          .select()
          .single();

        if (insertError) throw insertError;
        return data as FeatureTemplate;
      } catch (err) {
        console.error('Error creating feature:', err);
        throw err;
      }
    },
    []
  );

  // Delete a feature template
  const deleteFeature = useCallback(async (featureId: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('business_type_features')
        .delete()
        .eq('id', featureId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Error deleting feature:', err);
      throw err;
    }
  }, []);

  // Get features grouped by category for a business type
  const getFeaturesGroupedByCategory = useCallback(
    (features: FeatureTemplate[], cats: FeatureCategory[]) => {
      const grouped: Map<string, FeatureTemplate[]> = new Map();
      
      // Initialize with all categories
      cats.forEach((cat) => {
        grouped.set(cat.id, []);
      });
      
      // Add uncategorized group
      grouped.set('uncategorized', []);
      
      // Group features
      features.forEach((feature) => {
        const categoryId = feature.category_id || 'uncategorized';
        const group = grouped.get(categoryId) || [];
        group.push(feature);
        grouped.set(categoryId, group);
      });

      return grouped;
    },
    []
  );

  // Check if a feature is available for a tier
  const isFeatureAvailableForTier = useCallback(
    (feature: FeatureTemplate, tier: TierLevel): boolean => {
      const featureTierOrder = TIER_ORDER[feature.min_tier] || 1;
      const targetTierOrder = TIER_ORDER[tier];
      return featureTierOrder <= targetTierOrder;
    },
    []
  );

  return {
    categories,
    loading,
    error,
    fetchCategories,
    getTemplateForTier,
    applyTemplateToPlan,
    syncPlansWithTemplates,
    updateFeature,
    createFeature,
    deleteFeature,
    getFeaturesGroupedByCategory,
    isFeatureAvailableForTier,
  };
}
