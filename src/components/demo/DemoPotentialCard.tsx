import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Lock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDemoSession } from '@/hooks/useDemoSession';

export function DemoPotentialCard() {
  const { t, i18n } = useTranslation('demo');
  const { isDemoTenant } = useDemoSession();
  const isBengali = i18n.language === 'bn';

  if (!isDemoTenant) return null;

  const comparisonData = [
    {
      metric: t('potential.dailyRevenue'),
      demoValue: isBengali ? '৳৪৫,০০০' : '৳45,000',
      yourAction: t('potential.trackIt'),
    },
    {
      metric: t('potential.responseRate'),
      demoValue: '98%',
      yourAction: t('potential.measureIt'),
    },
    {
      metric: t('potential.dailyOrders'),
      demoValue: isBengali ? '২৩টি' : '23',
      yourAction: t('potential.startIt'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('potential.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comparison Table */}
          <div className="space-y-3">
            {/* Headers */}
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground">
              <div></div>
              <div className="text-center">{t('potential.demoBusiness')}</div>
              <div className="text-center">{t('potential.yourBusiness')}</div>
            </div>

            {/* Rows */}
            {comparisonData.map((row, index) => (
              <motion.div
                key={row.metric}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="grid grid-cols-3 gap-2 items-center py-2 border-b border-border/50 last:border-0"
              >
                <div className="text-sm font-medium">{row.metric}</div>
                <div className="text-center">
                  <span className="text-sm font-bold text-primary">{row.demoValue}</span>
                </div>
                <div className="text-center">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    {row.yourAction}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            asChild
            className="w-full gradient-brand gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            <Link to="/billing">
              {t('potential.setupDashboard')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
