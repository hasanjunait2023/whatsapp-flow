import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, MessageSquare, ShoppingCart, Package, 
  Zap, GitBranch, Calculator, BarChart3, FileText, Users,
  Loader2
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { SpotlightOverlay } from './SpotlightOverlay';
import { TourTooltip } from './TourTooltip';
import { TourStartCard } from './TourStartCard';
import { useOnboardingTour, TOUR_STEPS } from '@/hooks/useOnboardingTour';
import { useElementPosition } from '@/hooks/useElementPosition';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-5 w-5" />,
  MessageSquare: <MessageSquare className="h-5 w-5" />,
  ShoppingCart: <ShoppingCart className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  GitBranch: <GitBranch className="h-5 w-5" />,
  Calculator: <Calculator className="h-5 w-5" />,
  BarChart3: <BarChart3 className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
};

export function FeatureTour() {
  const { t } = useTranslation('onboarding');
  const location = useLocation();
  const {
    currentStep,
    totalSteps,
    currentStepData,
    isOpen,
    loading,
    isNavigating,
    shouldShowTour,
    nextStep,
    prevStep,
    goToStep,
    completeTour,
    skipTour,
    startTour,
  } = useOnboardingTour();

  const [direction, setDirection] = useState(0);
  
  // Always call hooks unconditionally
  const { position } = useElementPosition(
    isOpen && currentStepData ? currentStepData.targetSelector : null
  );

  const handleNext = useCallback(async () => {
    if (currentStep === totalSteps - 1) {
      await completeTour();
    } else {
      setDirection(1);
      await nextStep();
    }
  }, [currentStep, totalSteps, completeTour, nextStep]);

  const handlePrev = useCallback(async () => {
    setDirection(-1);
    await prevStep();
  }, [prevStep]);

  const handleGoToStep = useCallback(async (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    await goToStep(step);
  }, [currentStep, goToStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || isNavigating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        skipTour();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isNavigating, handleNext, handlePrev, skipTour]);

  // Determine what to show
  const showStartCard = shouldShowTour && !isOpen && location.pathname === '/dashboard';
  const showTourUI = isOpen;

  // Prepare tour UI data
  const stepId = currentStepData?.id || 'dashboard';
  const title = t(`tour.steps.${stepId}.title`);
  const description = t(`tour.steps.${stepId}.description`);
  const tip = t(`tour.steps.${stepId}.tip`, { defaultValue: '' });

  // Render nothing if neither start card nor tour should show
  if (!showStartCard && !showTourUI) {
    return null;
  }

  // Render start card
  if (showStartCard) {
    return <TourStartCard onStart={startTour} onSkip={skipTour} />;
  }

  // Render tour UI
  return (
    <>
      {/* Spotlight Overlay */}
      <SpotlightOverlay
        isVisible={isOpen && !!position && !isNavigating}
        targetRect={position}
        padding={currentStepData?.highlightPadding || 8}
        onClick={() => {}} // Prevent clicks on overlay
      />

      {/* Loading State during navigation */}
      <AnimatePresence>
        {isNavigating && (
          <div className="fixed inset-0 z-[99] flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">পেজ লোড হচ্ছে...</p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Tour Tooltip */}
      <AnimatePresence mode="wait">
        {!isNavigating && (
          <TourTooltip
            key={currentStep}
            title={title}
            description={description}
            tip={tip || undefined}
            icon={iconMap[currentStepData?.icon || 'LayoutDashboard']}
            currentStep={currentStep}
            totalSteps={totalSteps}
            position={currentStepData?.position || 'bottom'}
            targetRect={position}
            onNext={handleNext}
            onPrevious={handlePrev}
            onSkip={skipTour}
            isFirstStep={currentStep === 0}
            isLastStep={currentStep === totalSteps - 1}
          />
        )}
      </AnimatePresence>
    </>
  );
}
