import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Gift, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoSession } from '@/hooks/useDemoSession';

const EXIT_INTENT_SHOWN_KEY = 'demo_exit_intent_shown';
const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes

export function DemoExitIntent() {
  const { t } = useTranslation('demo');
  const navigate = useNavigate();
  const { isDemoTenant } = useDemoSession();
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(() => {
    return localStorage.getItem(EXIT_INTENT_SHOWN_KEY) === 'true';
  });

  const showExitIntent = useCallback(() => {
    if (!isDemoTenant || hasBeenShown) return;
    setIsVisible(true);
    setHasBeenShown(true);
    localStorage.setItem(EXIT_INTENT_SHOWN_KEY, 'true');
  }, [isDemoTenant, hasBeenShown]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleStartNow = () => {
    setIsVisible(false);
    navigate('/billing');
  };

  // Mouse leave detection (exit intent)
  useEffect(() => {
    if (!isDemoTenant || hasBeenShown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves from top of viewport
      if (e.clientY <= 0) {
        showExitIntent();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [isDemoTenant, hasBeenShown, showExitIntent]);

  // Inactivity detection
  useEffect(() => {
    if (!isDemoTenant || hasBeenShown) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(showExitIntent, INACTIVITY_TIMEOUT);
    };

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer, true));
    
    // Start initial timer
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer, true));
    };
  }, [isDemoTenant, hasBeenShown, showExitIntent]);

  // beforeunload event
  useEffect(() => {
    if (!isDemoTenant) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Note: Modern browsers don't allow custom messages, but we can still try
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDemoTenant]);

  if (!isDemoTenant) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-2xl">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors z-10"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Content */}
              <div className="p-8 text-center">
                {/* Warning icon */}
                <div className="mx-auto mb-6 p-4 rounded-full bg-amber-500/20 w-fit">
                  <AlertTriangle className="h-10 w-10 text-amber-500" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold mb-4">
                  ⚠️ {t('exitIntent.title')}
                </h2>

                {/* Message */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {t('exitIntent.message')}
                </p>

                {/* Special offer box */}
                <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-primary/10 border border-primary/20 mb-6">
                  <Gift className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    🎁 {t('exitIntent.specialOffer')}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleClose}
                  >
                    {t('exitIntent.later')}
                  </Button>
                  <Button
                    className="flex-1 gradient-brand gap-2 shadow-lg shadow-primary/25"
                    onClick={handleStartNow}
                  >
                    {t('exitIntent.startNow')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Bottom gradient accent */}
              <div className="h-1 bg-gradient-to-r from-primary via-primary/50 to-primary" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
