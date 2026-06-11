import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Package, 
  FileText, 
  Truck, 
  MessageCircle, 
  Users,
  Check,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSetupProgress, SETUP_STEPS } from '@/hooks/useSetupProgress';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Package,
  FileText,
  Truck,
  MessageCircle,
  Users,
};

export default function SetupWizard() {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const {
    totalSteps,
    completedSteps,
    actualStepStatus,
    loading,
    skipSetup,
  } = useSetupProgress();

  const progressPercent = (completedSteps / totalSteps) * 100;

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  const handleSkipAll = async () => {
    await skipSetup();
    navigate('/dashboard');
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{t('setup.title')}</h1>
          <p className="text-muted-foreground">{t('setup.subtitle')}</p>
        </div>

        {/* Progress Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {t('setup.progress', { completed: completedSteps, total: totalSteps })}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>

        {/* Setup Steps */}
        <Card>
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {SETUP_STEPS.map((step, index) => {
                const Icon = iconMap[step.icon] || MessageSquare;
                const isComplete = actualStepStatus[step.id as keyof typeof actualStepStatus];
                const stepTitle = t(`setup.steps.${step.id}.title`);
                const stepDescription = t(`setup.steps.${step.id}.description`);

                return (
                  <AccordionItem 
                    key={step.id} 
                    value={step.id}
                    className={cn(
                      index === 0 && "border-t-0",
                      isComplete && "bg-success/5"
                    )}
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          isComplete 
                            ? "bg-success text-success-foreground" 
                            : "bg-muted"
                        )}>
                          {isComplete ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium",
                              isComplete && "text-muted-foreground line-through"
                            )}>
                              {stepTitle}
                            </span>
                            {step.required && !isComplete && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                {t('setup.required')}
                              </Badge>
                            )}
                            {isComplete && (
                              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                                {t('setup.complete')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="pl-11 space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {stepDescription}
                        </p>
                        {!isComplete && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleNavigate(step.route)}
                            >
                              {t('setup.continue')}
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                            {!step.required && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                              >
                                {t('setup.skipStep')}
                                <ChevronRight className="ml-1 h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                        {isComplete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleNavigate(step.route)}
                          >
                            সেটিংস দেখুন
                            <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* Skip All Button */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={handleSkipAll}
            disabled={loading}
            className="text-muted-foreground"
          >
            {t('setup.skipAll')}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
