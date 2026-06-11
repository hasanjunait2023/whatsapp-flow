import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoPrompts } from '@/hooks/useDemoPrompts';

export function DemoConversionPrompts() {
  const { i18n } = useTranslation();
  const { currentPrompt, isVisible, dismissPrompt, handleCtaClick } = useDemoPrompts();
  const isBengali = i18n.language === 'bn';

  if (!currentPrompt || !isVisible) return null;

  const title = isBengali ? currentPrompt.titleBn : currentPrompt.titleEn;
  const message = isBengali ? currentPrompt.messageBn : currentPrompt.messageEn;
  const ctaText = isBengali ? currentPrompt.ctaTextBn : currentPrompt.ctaTextEn;
  const dismissText = isBengali ? 'দেখলাম' : 'Got it';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 100, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 max-w-sm"
      >
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl shadow-primary/20">
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 animate-pulse" />
          
          {/* Close button */}
          <button
            onClick={dismissPrompt}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="relative p-5">
            {/* Sparkle icon */}
            <div className="absolute top-4 left-4">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </div>

            {/* Content */}
            <div className="pt-2 pl-6">
              <h4 className="font-bold text-lg mb-2 pr-6">{title}</h4>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {message}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissPrompt}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {dismissText}
                </Button>
                <Button
                  size="sm"
                  onClick={handleCtaClick}
                  className="gradient-brand gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                >
                  {ctaText}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Progress bar (auto-dismiss indicator) */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 15, ease: 'linear' }}
            className="h-1 bg-primary/50"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
