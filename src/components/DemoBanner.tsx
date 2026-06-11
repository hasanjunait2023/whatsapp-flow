import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Gamepad2, Clock, Users, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoSession } from '@/hooks/useDemoSession';

export function DemoBanner() {
  const { t } = useTranslation('demo');
  const { isDemoTenant, formattedTime } = useDemoSession();

  if (!isDemoTenant) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-amber-950"
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.05)_25%,rgba(0,0,0,0.05)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.05)_75%)] bg-[length:10px_10px] animate-pulse" />
      
      <div className="relative px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        {/* Left section - Demo mode indicator */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Demo mode badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-600/20 border border-amber-600/30">
            <Gamepad2 className="h-4 w-4" />
            <span className="text-sm font-bold">{t('banner.demoMode')}</span>
          </div>

          {/* Session timer */}
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>{t('banner.session')}: {formattedTime}</span>
          </div>

          {/* Social proof */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            <span>{t('banner.businessesJoined')}</span>
          </div>
        </div>

        {/* Right section - CTA */}
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <Button
            asChild
            size="sm"
            className="bg-amber-900 hover:bg-amber-800 text-amber-50 gap-2 shadow-lg shadow-amber-900/30"
          >
            <Link to="/billing">
              <Sparkles className="h-4 w-4" />
              {t('banner.startNow')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
