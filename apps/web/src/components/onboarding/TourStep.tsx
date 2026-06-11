import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  MessageSquare, 
  ShoppingCart, 
  Package, 
  Zap, 
  GitBranch, 
  Calculator, 
  BarChart3, 
  FileText, 
  Users 
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  MessageSquare,
  ShoppingCart,
  Package,
  Zap,
  GitBranch,
  Calculator,
  BarChart3,
  FileText,
  Users,
};

interface TourStepProps {
  stepId: string;
  iconName: string;
  direction: number;
}

export function TourStep({ stepId, iconName, direction }: TourStepProps) {
  const { t } = useTranslation('onboarding');
  const Icon = iconMap[iconName] || LayoutDashboard;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  const title = t(`tour.steps.${stepId}.title`);
  const description = t(`tour.steps.${stepId}.description`);
  const tip = t(`tour.steps.${stepId}.tip`);

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepId}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="text-center space-y-4"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            {description}
          </p>
        </div>

        {tip && tip !== `tour.steps.${stepId}.tip` && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
            <span>{tip}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
