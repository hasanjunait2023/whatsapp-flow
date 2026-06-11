import { BusinessType } from '@/hooks/useBusinessTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Warehouse, ShoppingBag, Briefcase, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessTypeSelectorProps {
  businessTypes: BusinessType[];
  selectedType: string | null;
  onSelect: (typeId: string) => void;
  loading?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  warehouse: Warehouse,
  'shopping-bag': ShoppingBag,
  briefcase: Briefcase,
};

const FEATURES_PREVIEW: Record<string, string[]> = {
  wholesale: [
    'Bulk order management',
    'B2B pricing tiers',
    'Inventory tracking',
    'Dealer management',
  ],
  retail_ecom: [
    'Product catalog',
    'WooCommerce sync',
    'Courier integration',
    'Order tracking',
  ],
  service: [
    'Appointment booking',
    'Service catalog',
    'Client management',
    'Follow-up reminders',
  ],
};

export function BusinessTypeSelector({
  businessTypes,
  selectedType,
  onSelect,
  loading,
}: BusinessTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Select Your Business Type</h2>
        <p className="text-muted-foreground mt-2">
          Choose the category that best describes your business
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {businessTypes.map((type) => {
          const IconComponent = ICON_MAP[type.icon || ''] || Briefcase;
          const isSelected = selectedType === type.id;
          const previewFeatures = FEATURES_PREVIEW[type.slug] || [];

          return (
            <Card
              key={type.id}
              className={cn(
                'relative cursor-pointer transition-all hover:shadow-lg',
                isSelected && 'ring-2 ring-primary shadow-lg'
              )}
              onClick={() => onSelect(type.id)}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div
                  className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${type.color}15` }}
                >
                  <IconComponent
                    className="h-8 w-8"
                    style={{ color: type.color || undefined }}
                  />
                </div>
                <CardTitle className="text-lg">{type.name}</CardTitle>
                <CardDescription className="text-xs">{type.name_bn}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  {type.description}
                </p>

                <ul className="space-y-2">
                  {previewFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: type.color || undefined }}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
