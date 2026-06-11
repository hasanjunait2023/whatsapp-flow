import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShoppingCart,
  Package,
  Zap,
  GitBranch,
  BarChart3,
  Users,
  Bot,
  MessageSquare,
  FileText,
  Globe,
  UserRound,
  Facebook,
  FileBarChart,
} from 'lucide-react';

export interface FeatureFlags {
  orders_enabled: boolean;
  products_enabled: boolean;
  automation_enabled: boolean;
  workflows_enabled: boolean;
  analytics_enabled: boolean;
  team_enabled: boolean;
  ai_agent_enabled: boolean;
  quick_replies_enabled: boolean;
  invoice_generation: boolean;
  woocommerce_sync: boolean;
  contacts_enabled: boolean;
  fb_messenger_enabled: boolean;
  reports_enabled: boolean;
  followup_messages_enabled: boolean;
}

const FEATURE_CONFIG = [
  {
    key: 'contacts_enabled' as const,
    label: 'Contacts',
    description: 'Contact management and CRM features',
    icon: UserRound,
  },
  {
    key: 'orders_enabled' as const,
    label: 'Orders',
    description: 'Order creation and management',
    icon: ShoppingCart,
  },
  {
    key: 'products_enabled' as const,
    label: 'Products',
    description: 'Product catalog management',
    icon: Package,
  },
  {
    key: 'automation_enabled' as const,
    label: 'Automation',
    description: 'Automated message rules',
    icon: Zap,
  },
  {
    key: 'workflows_enabled' as const,
    label: 'Workflows',
    description: 'Visual workflow builder',
    icon: GitBranch,
  },
  {
    key: 'analytics_enabled' as const,
    label: 'Analytics',
    description: 'Reports and analytics dashboard',
    icon: BarChart3,
  },
  {
    key: 'team_enabled' as const,
    label: 'Team',
    description: 'Team member management',
    icon: Users,
  },
  {
    key: 'ai_agent_enabled' as const,
    label: 'AI Agent',
    description: 'AI-powered auto responses',
    icon: Bot,
  },
  {
    key: 'quick_replies_enabled' as const,
    label: 'Quick Replies',
    description: 'Saved message templates',
    icon: MessageSquare,
  },
  {
    key: 'invoice_generation' as const,
    label: 'Invoice Generation',
    description: 'PDF invoice generation',
    icon: FileText,
  },
  {
    key: 'woocommerce_sync' as const,
    label: 'WooCommerce Sync',
    description: 'Sync products with WooCommerce',
    icon: Globe,
  },
  {
    key: 'fb_messenger_enabled' as const,
    label: 'Facebook Messenger',
    description: 'Facebook Messenger inbox integration',
    icon: Facebook,
  },
  {
    key: 'reports_enabled' as const,
    label: 'Reports Hub',
    description: 'Business analytics and reports',
    icon: FileBarChart,
  },
  {
    key: 'followup_messages_enabled' as const,
    label: 'Follow-up Messages',
    description: 'Automated follow-up messaging (Pro)',
    icon: MessageSquare,
  },
];

interface FeatureTogglesProps {
  features: FeatureFlags;
  onChange: (features: FeatureFlags) => void;
  disabled?: boolean;
}

export default function FeatureToggles({
  features,
  onChange,
  disabled = false,
}: FeatureTogglesProps) {
  const handleToggle = (key: keyof FeatureFlags) => {
    onChange({
      ...features,
      [key]: !features[key],
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Feature Access</CardTitle>
        <CardDescription>
          Enable or disable features for this plan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURE_CONFIG.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                className="flex items-center justify-between border rounded-lg p-3 bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{feature.label}</Label>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={features[feature.key]}
                  onCheckedChange={() => handleToggle(feature.key)}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Export feature config for other components
export { FEATURE_CONFIG };
