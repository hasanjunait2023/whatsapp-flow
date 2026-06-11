import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import confetti from 'canvas-confetti';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  id: string;
  icon: string;
  route: string;
  targetSelector: string;
  position: TooltipPosition;
  highlightPadding?: number;
}

export const TOUR_STEPS: TourStep[] = [
  { 
    id: 'dashboard', 
    icon: 'LayoutDashboard', 
    route: '/dashboard',
    targetSelector: '[data-tour="dashboard-stats"]',
    position: 'bottom',
    highlightPadding: 12
  },
  { 
    id: 'inbox', 
    icon: 'MessageSquare', 
    route: '/inbox',
    targetSelector: '[data-tour="inbox-area"]',
    position: 'right',
    highlightPadding: 8
  },
  { 
    id: 'orders', 
    icon: 'ShoppingCart', 
    route: '/orders',
    targetSelector: '[data-tour="orders-table"]',
    position: 'top',
    highlightPadding: 8
  },
  { 
    id: 'products', 
    icon: 'Package', 
    route: '/products',
    targetSelector: '[data-tour="products-grid"]',
    position: 'top',
    highlightPadding: 8
  },
  { 
    id: 'automation', 
    icon: 'Zap', 
    route: '/automation',
    targetSelector: '[data-tour="automation-rules"]',
    position: 'bottom',
    highlightPadding: 8
  },
  { 
    id: 'workflows', 
    icon: 'GitBranch', 
    route: '/workflows',
    targetSelector: '[data-tour="workflow-cards"]',
    position: 'bottom',
    highlightPadding: 8
  },
  { 
    id: 'accounts', 
    icon: 'Calculator', 
    route: '/accounts',
    targetSelector: '[data-tour="accounts-overview"]',
    position: 'bottom',
    highlightPadding: 8
  },
  { 
    id: 'analytics', 
    icon: 'BarChart3', 
    route: '/analytics',
    targetSelector: '[data-tour="analytics-charts"]',
    position: 'bottom',
    highlightPadding: 8
  },
  { 
    id: 'reports', 
    icon: 'FileText', 
    route: '/reports',
    targetSelector: '[data-tour="report-selector"]',
    position: 'bottom',
    highlightPadding: 8
  },
  { 
    id: 'team', 
    icon: 'Users', 
    route: '/team',
    targetSelector: '[data-tour="team-list"]',
    position: 'top',
    highlightPadding: 8
  },
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

export function useOnboardingTour() {
  const { currentTenant: tenant, refetch } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  // Persist tour state to survive navigation
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('onboarding-tour-step');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('onboarding-tour-active');
    return saved === 'true';
  });
  
  const [loading, setLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isStepReady, setIsStepReady] = useState(false);
  const [isSkipped, setIsSkipped] = useState(() => {
    const saved = localStorage.getItem('onboarding-tour-skipped');
    return saved === 'true';
  });
  const tourActiveRef = useRef(false);
  
  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem('onboarding-tour-step', currentStep.toString());
  }, [currentStep]);
  
  useEffect(() => {
    localStorage.setItem('onboarding-tour-active', isOpen.toString());
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('onboarding-tour-skipped', isSkipped.toString());
  }, [isSkipped]);

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

  const shouldShowTour = !onboardingStatus.tour_completed && !onboardingStatus.tour_skipped && !isSkipped;

  // No auto-start - tour is started manually via startTour()

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

  // Navigate to step's page and wait for element
  const navigateToStep = useCallback(async (stepIndex: number) => {
    const step = TOUR_STEPS[stepIndex];
    
    // Reset step ready state - timer won't start until element is found
    setIsStepReady(false);
    
    // Update step FIRST - critical for correct selector lookup after navigation
    setCurrentStep(stepIndex);
    
    if (location.pathname !== step.route) {
      setIsNavigating(true);
      navigate(step.route);
      
      // Wait for navigation and page load
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Wait for target element to appear (with timeout)
      let attempts = 0;
      const maxAttempts = 30;
      while (attempts < maxAttempts) {
        const element = document.querySelector(step.targetSelector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 300));
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      setIsNavigating(false);
    } else {
      // Already on the page, just scroll to element
      const element = document.querySelector(step.targetSelector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    
    // Mark step as ready - now the 7-second timer can start
    setIsStepReady(true);
  }, [location.pathname, navigate]);

  const nextStep = useCallback(async () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      await navigateToStep(currentStep + 1);
    }
  }, [currentStep, navigateToStep]);

  const prevStep = useCallback(async () => {
    if (currentStep > 0) {
      await navigateToStep(currentStep - 1);
    }
  }, [currentStep, navigateToStep]);

  const goToStep = useCallback(async (step: number) => {
    if (step >= 0 && step < TOUR_STEPS.length) {
      await navigateToStep(step);
    }
  }, [navigateToStep]);

  const completeTour = useCallback(async () => {
    await updateOnboardingStatus({ tour_completed: true });
    tourActiveRef.current = false;
    localStorage.removeItem('onboarding-tour-active');
    localStorage.removeItem('onboarding-tour-step');
    navigate('/dashboard');
    setIsOpen(false);
    setCurrentStep(0);
    
    // Celebrate with confetti! 🎉
    const duration = 3000;
    const end = Date.now() + duration;
    
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
      });
      
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    
    frame();
  }, [updateOnboardingStatus, navigate]);

  const skipTour = useCallback(async () => {
    // Immediately hide the card
    setIsSkipped(true);
    setIsOpen(false);
    setCurrentStep(0);
    tourActiveRef.current = false;
    localStorage.removeItem('onboarding-tour-active');
    localStorage.removeItem('onboarding-tour-step');
    
    // Then persist to database in background
    await updateOnboardingStatus({ tour_skipped: true });
  }, [updateOnboardingStatus]);

  const startTour = useCallback(async () => {
    setCurrentStep(0);
    setIsStepReady(false);
    tourActiveRef.current = true;
    navigate('/dashboard');
    setIsOpen(true);
    
    // Wait a bit for navigation, then mark ready
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsStepReady(true);
  }, [navigate]);

  // Auto-advance to next step after 7 seconds - only starts when step is ready
  useEffect(() => {
    if (!isOpen || isNavigating || !isStepReady) return;
    
    const timer = setTimeout(async () => {
      if (currentStep < TOUR_STEPS.length - 1) {
        await navigateToStep(currentStep + 1);
      } else {
        // Final step - complete the tour
        await completeTour();
      }
    }, 7000);
    
    return () => clearTimeout(timer);
  }, [isOpen, isNavigating, isStepReady, currentStep]);

  return {
    currentStep,
    totalSteps: TOUR_STEPS.length,
    currentStepData: TOUR_STEPS[currentStep],
    isOpen,
    loading,
    isNavigating,
    onboardingStatus,
    shouldShowTour,
    nextStep,
    prevStep,
    goToStep,
    completeTour,
    skipTour,
    startTour,
    setIsOpen,
  };
}
