import { ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TourTooltipProps {
  title: string;
  description: string;
  tip?: string;
  icon?: ReactNode;
  currentStep: number;
  totalSteps: number;
  position: TooltipPosition;
  targetRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const TOOLTIP_WIDTH = 340;
const TOOLTIP_MARGIN = 16;

export function TourTooltip({
  title,
  description,
  tip,
  icon,
  currentStep,
  totalSteps,
  position,
  targetRect,
  onNext,
  onPrevious,
  onSkip,
  isFirstStep,
  isLastStep,
}: TourTooltipProps) {
  const { t } = useTranslation('onboarding');
  const tooltipStyle = useMemo(() => {
    if (!targetRect) {
      // Center on screen if no target
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let top: number;
    let left: number;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = position;

    switch (position) {
      case 'bottom':
        top = targetRect.y + targetRect.height + TOOLTIP_MARGIN;
        left = targetRect.x + targetRect.width / 2 - TOOLTIP_WIDTH / 2;
        arrowPosition = 'top';
        break;
      case 'top':
        top = targetRect.y - TOOLTIP_MARGIN - 220; // Approximate tooltip height
        left = targetRect.x + targetRect.width / 2 - TOOLTIP_WIDTH / 2;
        arrowPosition = 'bottom';
        break;
      case 'right':
        top = targetRect.y + targetRect.height / 2 - 110;
        left = targetRect.x + targetRect.width + TOOLTIP_MARGIN;
        arrowPosition = 'left';
        break;
      case 'left':
        top = targetRect.y + targetRect.height / 2 - 110;
        left = targetRect.x - TOOLTIP_WIDTH - TOOLTIP_MARGIN;
        arrowPosition = 'right';
        break;
      default:
        top = targetRect.y + targetRect.height + TOOLTIP_MARGIN;
        left = targetRect.x + targetRect.width / 2 - TOOLTIP_WIDTH / 2;
        arrowPosition = 'top';
    }

    // Keep within viewport bounds
    left = Math.max(16, Math.min(left, viewport.width - TOOLTIP_WIDTH - 16));
    top = Math.max(16, Math.min(top, viewport.height - 250));

    return { top, left, arrowPosition };
  }, [targetRect, position]);

  const arrowClasses = useMemo(() => {
    const arrowPos = (tooltipStyle as any).arrowPosition || 'top';
    switch (arrowPos) {
      case 'top':
        return 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-[hsl(var(--card))]';
      case 'bottom':
        return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-[hsl(var(--card))]';
      case 'left':
        return 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[hsl(var(--card))]';
      case 'right':
        return 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[hsl(var(--card))]';
      default:
        return '';
    }
  }, [tooltipStyle]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="fixed z-[100] pointer-events-auto"
      style={{
        top: typeof tooltipStyle.top === 'number' ? tooltipStyle.top : tooltipStyle.top,
        left: typeof tooltipStyle.left === 'number' ? tooltipStyle.left : tooltipStyle.left,
        transform: tooltipStyle.transform,
        width: TOOLTIP_WIDTH,
      }}
    >
      {/* Arrow */}
      <div
        className={cn(
          'absolute w-0 h-0 border-[12px] border-solid',
          arrowClasses
        )}
      />

      {/* Card */}
      <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
              {icon}
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>

          {tip && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400">{tip}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            disabled={isFirstStep}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('tour.previous')}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onNext}
            className="gap-1"
          >
            {isLastStep ? t('tour.finish') : t('tour.next')}
            {!isLastStep && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Skip Tour Link */}
        <div className="px-4 pb-3 text-center">
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('tour.skipTour')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
