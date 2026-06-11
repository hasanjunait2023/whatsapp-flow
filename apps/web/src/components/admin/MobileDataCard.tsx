import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface MobileDataCardField {
  key: string;
  label?: string;
  render: (data: any) => ReactNode;
  className?: string;
}

interface MobileDataCardProps {
  data: Record<string, any>;
  fields: MobileDataCardField[];
  header?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  onClick?: () => void;
}

export function MobileDataCard({
  data,
  fields,
  header,
  footer,
  actions,
  selected,
  onSelect,
  className,
  onClick,
}: MobileDataCardProps) {
  return (
    <Card
      className={cn(
        'p-4 transition-colors',
        selected && 'ring-2 ring-primary bg-primary/5',
        onClick && 'cursor-pointer hover:bg-muted/50',
        className
      )}
      onClick={onClick}
    >
      {/* Header with checkbox and actions */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {onSelect && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => {
                checked !== 'indeterminate' && onSelect();
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5"
            />
          )}
          <div className="flex-1 min-w-0">
            {header}
          </div>
        </div>
        {actions && (
          <div onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.key} className={cn('flex items-center justify-between gap-2 text-sm', field.className)}>
            {field.label && (
              <span className="text-muted-foreground shrink-0">{field.label}</span>
            )}
            <span className={cn('text-right', !field.label && 'text-left w-full')}>
              {field.render(data)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      {footer && (
        <div className="mt-3 pt-3 border-t">
          {footer}
        </div>
      )}
    </Card>
  );
}
