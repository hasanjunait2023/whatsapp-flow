import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Play, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface TourStartCardProps {
  onStart: () => void;
  onSkip: () => void;
}

export function TourStartCard({ onStart, onSkip }: TourStartCardProps) {
  const { t } = useTranslation('onboarding');
  const [container, setContainer] = useState<Element | null>(null);

  // Find the dashboard content container to portal into
  useEffect(() => {
    // Look for the tour card slot in dashboard, or use body as fallback
    const slot = document.querySelector('[data-tour-card-slot]');
    setContainer(slot);
  }, []);

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 rounded-full bg-primary/20 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {t('tour.startCard.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('tour.startCard.description')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                {t('tour.startCard.skipLink')}
              </Button>
              <Button onClick={onStart} className="gap-2">
                <Play className="h-4 w-4" />
                {t('tour.startCard.startButton')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Portal into the slot if available, otherwise render nothing (will be handled differently)
  if (container) {
    return createPortal(cardContent, container);
  }

  // Fallback: render as fixed toast-like notification at top
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      {cardContent}
    </div>
  );
}
