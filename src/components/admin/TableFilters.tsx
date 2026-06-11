import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Filter, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date-range';
  options?: FilterOption[];
}

export interface ActiveFilters {
  [key: string]: string | { from?: Date; to?: Date } | undefined;
}

interface TableFiltersProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilters;
  onFiltersChange: (filters: ActiveFilters) => void;
  className?: string;
}

export function TableFilters({
  filters,
  activeFilters,
  onFiltersChange,
  className,
}: TableFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = Object.values(activeFilters).filter((v) => {
    if (typeof v === 'object' && v !== null) {
      return v.from || v.to;
    }
    return v && v !== 'all';
  }).length;

  const handleFilterChange = (key: string, value: string | { from?: Date; to?: Date }) => {
    onFiltersChange({
      ...activeFilters,
      [key]: value,
    });
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getFilterLabel = (filter: FilterConfig, value: string | { from?: Date; to?: Date } | undefined): string => {
    if (!value) return '';
    
    if (filter.type === 'select' && typeof value === 'string') {
      const option = filter.options?.find((o) => o.value === value);
      return option?.label || value;
    }
    
    if (filter.type === 'date-range' && typeof value === 'object') {
      const parts = [];
      if (value.from) parts.push(format(value.from, 'MMM d'));
      if (value.to) parts.push(format(value.to, 'MMM d'));
      return parts.join(' - ');
    }
    
    return String(value);
  };

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              )}
            </div>

            {filters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <Label className="text-sm">{filter.label}</Label>
                
                {filter.type === 'select' && (
                  <Select
                    value={(activeFilters[filter.key] as string) || 'all'}
                    onValueChange={(value) => handleFilterChange(filter.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {filter.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {filter.type === 'date-range' && (
                  <DateRangePicker
                    value={activeFilters[filter.key] as { from?: Date; to?: Date } | undefined}
                    onChange={(value) => handleFilterChange(filter.key, value)}
                  />
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {Object.entries(activeFilters).map(([key, value]) => {
        if (!value || (typeof value === 'string' && value === 'all')) return null;
        if (typeof value === 'object' && !value.from && !value.to) return null;
        
        const filter = filters.find((f) => f.key === key);
        if (!filter) return null;

        return (
          <Badge key={key} variant="secondary" className="gap-1 pr-1">
            <span className="text-muted-foreground">{filter.label}:</span>
            {getFilterLabel(filter, value)}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => clearFilter(key)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        );
      })}
    </div>
  );
}

interface DateRangePickerProps {
  value?: { from?: Date; to?: Date };
  onChange: (value: { from?: Date; to?: Date }) => void;
}

function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <Popover open={fromOpen} onOpenChange={setFromOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'flex-1 justify-start text-left font-normal',
              !value?.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? format(value.from, 'MMM d, yyyy') : 'From'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value?.from}
            onSelect={(date) => {
              onChange({ ...value, from: date });
              setFromOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Popover open={toOpen} onOpenChange={setToOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'flex-1 justify-start text-left font-normal',
              !value?.to && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.to ? format(value.to, 'MMM d, yyyy') : 'To'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value?.to}
            onSelect={(date) => {
              onChange({ ...value, to: date });
              setToOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
