import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, DollarSign, Users, Package, Settings2, LayoutDashboard } from 'lucide-react';

export type ReportType =
  | 'overview'
  | 'sales'
  | 'financial'
  | 'customers'
  | 'products'
  | 'operations';

const reportOptions: { value: ReportType; label: string; icon: React.ReactNode }[] = [
  { value: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { value: 'sales', label: 'Sales Report', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'financial', label: 'Financial Report', icon: <DollarSign className="h-4 w-4" /> },
  { value: 'customers', label: 'Customer Report', icon: <Users className="h-4 w-4" /> },
  { value: 'products', label: 'Product Report', icon: <Package className="h-4 w-4" /> },
  { value: 'operations', label: 'Operations Report', icon: <Settings2 className="h-4 w-4" /> },
];

interface ReportSelectorProps {
  value: ReportType;
  onChange: (value: ReportType) => void;
}

export function ReportSelector({ value, onChange }: ReportSelectorProps) {
  return (
    <div data-tour="report-selector" className="inline-block">
      <Select value={value} onValueChange={(v) => onChange(v as ReportType)}>
        <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select report" />
      </SelectTrigger>
      <SelectContent>
        {reportOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
        </SelectContent>
      </Select>
    </div>
  );
}
