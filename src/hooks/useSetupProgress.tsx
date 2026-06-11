import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useInstances } from '@/hooks/useInstances';
import { useProducts } from '@/hooks/useProducts';
import { useQuickReplies } from '@/hooks/useQuickReplies';
import { useTeam } from '@/hooks/useTeam';
import { useCourier } from '@/hooks/useCourier';

export interface SetupStep {
  id: string;
  icon: string;
  required: boolean;
  route: string;
}

export const SETUP_STEPS: SetupStep[] = [
  { id: 'whatsapp', icon: 'MessageSquare', required: true, route: '/instances' },
  { id: 'products', icon: 'Package', required: false, route: '/products' },
  { id: 'invoice', icon: 'FileText', required: false, route: '/settings' },
  { id: 'courier', icon: 'Truck', required: false, route: '/settings' },
  { id: 'quickReplies', icon: 'MessageCircle', required: false, route: '/settings' },
  { id: 'team', icon: 'Users', required: false, route: '/team' },
];

interface OnboardingStatus {
  tour_completed: boolean;
  tour_skipped: boolean;
  setup_completed: boolean;
  setup_steps: {
    whatsapp: boolean;
    products: boolean;
    invoice: boolean;
    courier: boolean;
    quickReplies: boolean;
    team: boolean;
  };
}

export function useSetupProgress() {
  const { currentTenant: tenant, refetch } = useTenant();
  const { instances } = useInstances();
  const { products } = useProducts();
  const { quickReplies } = useQuickReplies();
  const { members: teamMembers } = useTeam();
  const { integrations } = useCourier();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const onboardingStatus = ((tenant as any)?.onboarding_status as OnboardingStatus) || {
    tour_completed: false,
    tour_skipped: false,
    setup_completed: false,
    setup_steps: {
      whatsapp: false,
      products: false,
      invoice: false,
      courier: false,
      quickReplies: false,
      team: false,
    },
  };

  // Calculate actual completion status based on data
  const actualStepStatus = {
    whatsapp: (instances?.length || 0) > 0,
    products: (products?.length || 0) > 0,
    invoice: Boolean((tenant as any)?.company_name), // Check if invoice settings exist
    courier: (integrations?.length || 0) > 0,
    quickReplies: (quickReplies?.length || 0) > 0,
    team: (teamMembers?.filter(m => m.role !== 'owner')?.length || 0) > 0,
  };

  const completedSteps = Object.values(actualStepStatus).filter(Boolean).length;
  const totalSteps = SETUP_STEPS.length;
  const isSetupComplete = completedSteps === totalSteps || actualStepStatus.whatsapp;
  const shouldShowSetupBanner = !onboardingStatus.setup_completed && 
    (onboardingStatus.tour_completed || onboardingStatus.tour_skipped);

  const updateOnboardingStatus = useCallback(async (updates: Partial<OnboardingStatus>) => {
    if (!tenant?.id) return;
    
    setLoading(true);
    try {
      const newStatus = { ...onboardingStatus, ...updates };
      await supabase
        .from('tenants')
        .update({ onboarding_status: newStatus })
        .eq('id', tenant.id);
      await refetch();
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, onboardingStatus, refetch]);

  const markStepComplete = useCallback(async (stepId: string) => {
    const newSteps = { ...onboardingStatus.setup_steps, [stepId]: true };
    await updateOnboardingStatus({ setup_steps: newSteps });
  }, [onboardingStatus.setup_steps, updateOnboardingStatus]);

  const completeSetup = useCallback(async () => {
    await updateOnboardingStatus({ setup_completed: true });
  }, [updateOnboardingStatus]);

  const skipSetup = useCallback(async () => {
    await updateOnboardingStatus({ setup_completed: true });
  }, [updateOnboardingStatus]);

  const nextStep = useCallback(() => {
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < SETUP_STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  return {
    currentStep,
    currentStepData: SETUP_STEPS[currentStep],
    totalSteps,
    completedSteps,
    actualStepStatus,
    onboardingStatus,
    isSetupComplete,
    shouldShowSetupBanner,
    loading,
    nextStep,
    prevStep,
    goToStep,
    markStepComplete,
    completeSetup,
    skipSetup,
    setCurrentStep,
  };
}
