import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSetupProgress } from '@/hooks/useSetupProgress';

export function SetupBanner() {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const { completedSteps, totalSteps, shouldShowSetupBanner, skipSetup } = useSetupProgress();

  if (!shouldShowSetupBanner) return null;

  const progressPercent = (completedSteps / totalSteps) * 100;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div className="flex-1">
          <h3 className="font-semibold">{t('banner.title')}</h3>
          <p className="text-sm text-muted-foreground mb-2">
            {t('banner.description')}
          </p>
          <div className="flex items-center gap-2">
            <Progress value={progressPercent} className="w-32 h-2" />
            <span className="text-xs text-muted-foreground">
              {t('setup.progress', { completed: completedSteps, total: totalSteps })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={skipSetup}
            className="text-muted-foreground"
          >
            এড়িয়ে যান
          </Button>
          <Button onClick={() => navigate('/setup')}>
            {t('setup.continue')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
