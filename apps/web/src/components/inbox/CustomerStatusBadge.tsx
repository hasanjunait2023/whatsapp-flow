import * as React from 'react';
import { CustomerStatusLabel, statusColorClasses } from '@/lib/customer-status-config';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface CustomerStatusBadgeProps {
  status: CustomerStatusLabel | null;
  size?: 'sm' | 'md';
  className?: string;
}

function CustomerStatusBadgeInner(
  { status, size = 'sm', className }: CustomerStatusBadgeProps,
  ref: React.ForwardedRef<HTMLSpanElement>
) {
  const { i18n } = useTranslation();

  if (!status) return null;

  const isBengali = i18n.language === 'bn';
  const label = isBengali ? status.bn : status.en;
  const colorClasses = statusColorClasses[status.color];

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        colorClasses,
        className
      )}
    >
      {label}
    </span>
  );
}

const CustomerStatusBadge = React.forwardRef(CustomerStatusBadgeInner);
CustomerStatusBadge.displayName = 'CustomerStatusBadge';

export default CustomerStatusBadge;
