import { cn } from '@/lib/utils';

interface TourProgressProps {
  currentStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
}

export function TourProgress({ currentStep, totalSteps, onStepClick }: TourProgressProps) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <button
          key={index}
          onClick={() => onStepClick(index)}
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-300 hover:scale-125",
            index === currentStep
              ? "bg-primary w-6"
              : index < currentStep
              ? "bg-primary/60"
              : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
          )}
          aria-label={`Go to step ${index + 1}`}
        />
      ))}
    </div>
  );
}
