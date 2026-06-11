import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings2, ArrowRight, Check, X } from 'lucide-react';
import { FEATURE_FLAGS, FeatureFlag } from '@/hooks/useFeatureAccess';

export interface TenantWithOverrides {
  id: string;
  name: string;
  plan_name: string | null;
  override_count: number;
  enabled_overrides: string[];
  disabled_overrides: string[];
}

interface FeatureOverridesWidgetProps {
  tenants: TenantWithOverrides[];
  loading?: boolean;
}

// Short labels for features
const FEATURE_LABELS: Record<FeatureFlag, string> = {
  orders_enabled: 'Orders',
  products_enabled: 'Products',
  contacts_enabled: 'Contacts',
  automation_enabled: 'Automation',
  workflows_enabled: 'Workflows',
  analytics_enabled: 'Analytics',
  team_enabled: 'Team',
  ai_agent_enabled: 'AI Agent',
  quick_replies_enabled: 'Quick Replies',
  invoice_generation: 'Invoices',
  woocommerce_sync: 'WooCommerce',
  followup_messages_enabled: 'Follow-up Messages',
};

export function FeatureOverridesWidget({ tenants, loading }: FeatureOverridesWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Feature Overrides
            </CardTitle>
            <CardDescription>
              Tenants with custom feature configurations
            </CardDescription>
          </div>
          <Badge variant="secondary">{tenants.length} tenants</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No custom overrides</p>
            <p className="text-xs mt-1">All tenants are using plan defaults</p>
          </div>
        ) : (
          <ScrollArea className="h-[220px] pr-4 -mr-4">
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{tenant.name}</p>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {tenant.plan_name || 'No plan'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tenant.enabled_overrides.slice(0, 3).map((key) => (
                          <Badge
                            key={key}
                            variant="secondary"
                            className="text-xs bg-green-500/10 text-green-600 border-green-500/20"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {FEATURE_LABELS[key as FeatureFlag] || key}
                          </Badge>
                        ))}
                        {tenant.disabled_overrides.slice(0, 3).map((key) => (
                          <Badge
                            key={key}
                            variant="secondary"
                            className="text-xs bg-red-500/10 text-red-600 border-red-500/20"
                          >
                            <X className="h-3 w-3 mr-1" />
                            {FEATURE_LABELS[key as FeatureFlag] || key}
                          </Badge>
                        ))}
                        {tenant.override_count > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{tenant.override_count - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className="shrink-0">
                      {tenant.override_count} override{tenant.override_count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <div className="mt-4 pt-3 border-t">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/admin/tenants">
              Manage All Tenants
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
