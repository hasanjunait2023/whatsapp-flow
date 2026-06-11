import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Plan, usePlans } from '@/hooks/usePlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  Rocket,
  Zap,
  Crown,
  Smartphone,
  Users,
  MessageSquare,
  Bot,
  Sparkles,
  ArrowRight,
  Star,
} from 'lucide-react';

interface PlanComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPlan?: (plan: Plan) => void;
}

interface FeatureRow {
  id: string;
  label: string;
  labelBn: string | null;
  category: string;
  categoryBn: string | null;
  minTier: 'starter' | 'growth' | 'pro';
  isHighlight: boolean;
  icon: string | null;
}

const TIER_ORDER = { starter: 1, growth: 2, pro: 3 };

const TIER_CONFIG = [
  { 
    tier: 'starter' as const, 
    label: 'Starter', 
    labelBn: 'স্টার্টার',
    icon: Rocket, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  { 
    tier: 'growth' as const, 
    label: 'Growth', 
    labelBn: 'গ্রোথ',
    icon: Zap, 
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    popular: true,
  },
  { 
    tier: 'pro' as const, 
    label: 'Pro', 
    labelBn: 'প্রো',
    icon: Crown, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
];

export function PlanComparisonModal({ 
  open, 
  onOpenChange, 
  onSelectPlan 
}: PlanComparisonModalProps) {
  const { i18n } = useTranslation();
  const { currentTenant } = useTenant();
  const { plans, loading: plansLoading } = usePlans(currentTenant?.business_type_id);
  const { subscription } = useSubscription();
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const isBengali = i18n.language === 'bn';

  // Fetch features for the business type
  useEffect(() => {
    if (!open || !currentTenant?.business_type_id) return;

    const fetchFeatures = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('business_type_features')
          .select(`
            id,
            feature_label,
            feature_label_bn,
            min_tier,
            is_highlight,
            icon,
            display_order,
            feature_categories (
              name,
              name_bn
            )
          `)
          .eq('business_type_id', currentTenant.business_type_id)
          .order('display_order', { ascending: true });

        if (error) throw error;

        const mappedFeatures: FeatureRow[] = (data || []).map((f: any) => ({
          id: f.id,
          label: f.feature_label,
          labelBn: f.feature_label_bn,
          category: f.feature_categories?.name || 'Other',
          categoryBn: f.feature_categories?.name_bn || 'অন্যান্য',
          minTier: f.min_tier,
          isHighlight: f.is_highlight,
          icon: f.icon,
        }));

        setFeatures(mappedFeatures);
      } catch (err) {
        console.error('Error fetching features:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, [open, currentTenant?.business_type_id]);

  // Sort plans by price
  const sortedPlans = [...plans].sort((a, b) => a.price_monthly - b.price_monthly);

  // Map plans to tiers
  const plansByTier = sortedPlans.reduce((acc, plan, index) => {
    const tierKey = index === 0 ? 'starter' : index === 1 ? 'growth' : 'pro';
    acc[tierKey] = plan;
    return acc;
  }, {} as Record<string, Plan>);

  // Check if feature is available for tier
  const isFeatureAvailable = (feature: FeatureRow, tier: 'starter' | 'growth' | 'pro') => {
    return TIER_ORDER[feature.minTier] <= TIER_ORDER[tier];
  };

  // Get current plan tier
  const getCurrentPlanTier = () => {
    const currentPlanIndex = sortedPlans.findIndex(p => p.id === subscription?.plan_id);
    if (currentPlanIndex === 0) return 'starter';
    if (currentPlanIndex === 1) return 'growth';
    if (currentPlanIndex === 2) return 'pro';
    return null;
  };

  const currentTier = getCurrentPlanTier();

  // Group features by category
  const groupedFeatures = features.reduce((acc, feature) => {
    const category = isBengali && feature.categoryBn ? feature.categoryBn : feature.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, FeatureRow[]>);

  const handleSelectPlan = (plan: Plan) => {
    onSelectPlan?.(plan);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl">
            {isBengali ? 'প্ল্যান তুলনা করুন' : 'Compare Plans'}
          </DialogTitle>
          <DialogDescription>
            {isBengali 
              ? 'আপনার ব্যবসার জন্য সেরা প্ল্যান বেছে নিন' 
              : 'Choose the best plan for your business'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="p-6 pt-4">
            {loading || plansLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Plan Headers */}
                <div className="grid grid-cols-4 gap-4 sticky top-0 bg-background z-10 pb-4">
                  {/* Empty cell for feature names */}
                  <div className="flex items-end">
                    <span className="text-sm font-medium text-muted-foreground">
                      {isBengali ? 'ফিচার সমূহ' : 'Features'}
                    </span>
                  </div>

                  {/* Plan columns */}
                  {TIER_CONFIG.map((config, index) => {
                    const plan = plansByTier[config.tier];
                    const isCurrentPlan = config.tier === currentTier;
                    const Icon = config.icon;

                    return (
                      <motion.div
                        key={config.tier}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          'relative rounded-xl border-2 p-4 text-center',
                          config.borderColor,
                          config.bgColor,
                          isCurrentPlan && 'ring-2 ring-primary ring-offset-2'
                        )}
                      >
                        {config.popular && (
                          <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gradient-brand">
                            <Star className="h-3 w-3 mr-1" />
                            {isBengali ? 'জনপ্রিয়' : 'Popular'}
                          </Badge>
                        )}
                        
                        {isCurrentPlan && (
                          <Badge variant="outline" className="absolute -top-2.5 right-2 bg-background">
                            {isBengali ? 'বর্তমান' : 'Current'}
                          </Badge>
                        )}

                        <Icon className={cn('h-8 w-8 mx-auto mb-2', config.color)} />
                        <h3 className="font-bold text-lg">
                          {isBengali ? config.labelBn : config.label}
                        </h3>
                        
                        {plan && (
                          <>
                            <div className="mt-2">
                              <span className="text-2xl font-bold">৳{plan.price_monthly}</span>
                              <span className="text-muted-foreground text-sm">/{isBengali ? 'মাস' : 'mo'}</span>
                            </div>
                            
                            {/* Quick limits */}
                            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center justify-center gap-1">
                                <Smartphone className="h-3 w-3" />
                                <span>{plan.max_instances} {isBengali ? 'ইন্সট্যান্স' : 'Instance'}</span>
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{plan.max_agents} {isBengali ? 'এজেন্ট' : 'Agents'}</span>
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{(plan.max_messages_per_month / 1000).toFixed(0)}K {isBengali ? 'মেসেজ' : 'Msgs'}</span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              className={cn(
                                'mt-4 w-full gap-1',
                                isCurrentPlan && 'opacity-50'
                              )}
                              variant={isCurrentPlan ? 'outline' : 'default'}
                              disabled={isCurrentPlan}
                              onClick={() => handleSelectPlan(plan)}
                            >
                              {isCurrentPlan ? (
                                isBengali ? 'বর্তমান প্ল্যান' : 'Current Plan'
                              ) : (
                                <>
                                  {isBengali ? 'বেছে নিন' : 'Select'}
                                  <ArrowRight className="h-3 w-3" />
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Feature Comparison Table */}
                <div className="space-y-6">
                  {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                    <div key={category} className="space-y-2">
                      {/* Category Header */}
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide border-b pb-2">
                        {category}
                      </h4>

                      {/* Feature Rows */}
                      {categoryFeatures.map((feature, featureIndex) => (
                        <motion.div
                          key={feature.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: featureIndex * 0.02 }}
                          className={cn(
                            'grid grid-cols-4 gap-4 py-3 border-b border-border/50 last:border-0',
                            feature.isHighlight && 'bg-primary/5 -mx-2 px-2 rounded-lg'
                          )}
                        >
                          {/* Feature Name */}
                          <div className="flex items-center gap-2">
                            {feature.isHighlight && (
                              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                            <span className={cn(
                              'text-sm',
                              feature.isHighlight && 'font-medium'
                            )}>
                              {isBengali && feature.labelBn ? feature.labelBn : feature.label}
                            </span>
                          </div>

                          {/* Tier Availability */}
                          {TIER_CONFIG.map((config) => {
                            const available = isFeatureAvailable(feature, config.tier);
                            return (
                              <div key={config.tier} className="flex items-center justify-center">
                                {available ? (
                                  <div className={cn(
                                    'flex items-center justify-center h-6 w-6 rounded-full',
                                    config.bgColor
                                  )}>
                                    <Check className={cn('h-4 w-4', config.color)} />
                                  </div>
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground/40" />
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      ))}
                    </div>
                  ))}

                  {/* AI Feature Row (from plan data) */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide border-b pb-2">
                      {isBengali ? 'এআই ফিচার' : 'AI Features'}
                    </h4>
                    <div className="grid grid-cols-4 gap-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          {isBengali ? 'এআই এজেন্ট' : 'AI Agent'}
                        </span>
                      </div>
                      {TIER_CONFIG.map((config) => {
                        const plan = plansByTier[config.tier];
                        const hasAI = plan?.ai_enabled;
                        return (
                          <div key={config.tier} className="flex items-center justify-center">
                            {hasAI ? (
                              <div className={cn(
                                'flex items-center justify-center h-6 w-6 rounded-full',
                                config.bgColor
                              )}>
                                <Check className={cn('h-4 w-4', config.color)} />
                              </div>
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {isBengali 
                      ? 'প্রশ্ন আছে? আমাদের সাথে যোগাযোগ করুন' 
                      : 'Have questions? Contact us for help'}
                  </p>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    {isBengali ? 'বন্ধ করুন' : 'Close'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
