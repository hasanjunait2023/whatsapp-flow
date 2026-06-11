import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Gift, Copy, Check, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDemoSession } from '@/hooks/useDemoSession';
import { toast } from 'sonner';

const PROMO_CODE = 'DEMO20';

export function DemoSpecialOfferCard() {
  const { t, i18n } = useTranslation('demo');
  const { isDemoTenant, formattedTime } = useDemoSession();
  const [copied, setCopied] = useState(false);
  const isBengali = i18n.language === 'bn';

  if (!isDemoTenant) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      toast.success(t('offer.codeCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-primary/5">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse" />
        
        {/* Sparkle decorations */}
        <div className="absolute top-4 right-4">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <div className="absolute bottom-4 left-4 opacity-50">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>

        <CardContent className="relative p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-full bg-primary/20">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-bold text-lg">{t('offer.title')}</h3>
          </div>

          {/* Main offer */}
          <div className="text-center py-4">
            <p className="text-2xl font-bold text-primary mb-2">
              {t('offer.discount')}
            </p>
            
            {/* Promo code box */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-muted border-2 border-dashed border-primary/30">
              <span className="text-sm text-muted-foreground">{t('offer.code')}:</span>
              <span className="font-mono font-bold text-lg tracking-wider">{PROMO_CODE}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                ⏱️ {formattedTime} {t('offer.remaining')}
              </span>
            </div>
          </div>

          {/* Social proof */}
          <p className="text-xs text-center text-muted-foreground mb-4">
            {t('offer.weeklySignups')}
          </p>

          {/* Daily price comparison */}
          <div className="text-center mb-4 py-2 px-3 rounded-lg bg-primary/10">
            <p className="text-sm">
              {t('offer.dailyPrice')} <span className="font-bold text-primary">৳{isBengali ? '৬৭' : '67'}</span>/
              {isBengali ? 'দিন' : 'day'} - {t('offer.teaPrice')}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyCode}
            >
              {t('offer.copyCode')}
            </Button>
            <Button
              className="flex-1 gradient-brand shadow-lg shadow-primary/25"
              onClick={() => {
                // Scroll to plans section
                document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('offer.subscribeNow')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
