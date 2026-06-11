import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Filter, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FilterConfig, ActiveFilters } from './TableFilters';

interface MobileTableFiltersProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilters;
  onFiltersChange: (filters: ActiveFilters) => void;
  className?: string;
}

export function MobileTableFilters({
  filters,
  activeFilters,
  onFiltersChange,
  className,
}: MobileTableFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

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
    setIsOpen(false);
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

  const FilterContent = () => (
    <div className="space-y-6">
      {filters.map((filter) => (
        <div key={filter.key} className="space-y-2">
          <Label className="text-sm font-medium">{filter.label}</Label>
          
          {filter.type === 'select' && (
            <Select
              value={(activeFilters[filter.key] as string) || 'all'}
              onValueChange={(value) => handleFilterChange(filter.key, value)}
            >
              <SelectTrigger className="w-full">
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
            <MobileDateRangePicker
              value={activeFilters[filter.key] as { from?: Date; to?: Date } | undefined}
              onChange={(value) => handleFilterChange(filter.key, value)}
            />
          )}
        </div>
      ))}
    </div>
  );

  // Use Sheet on mobile, Popover on desktop
  if (isMobile) {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
            <SheetHeader className="mb-6">
              <div className="flex items-center justify-between">
                <SheetTitle>Filters</SheetTitle>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-muted-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </SheetHeader>
            <ScrollArea className="h-[calc(100%-120px)]">
              <FilterContent />
            </ScrollArea>
            <SheetFooter className="mt-6">
              <Button className="w-full" onClick={() => setIsOpen(false)}>
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Active filter badges */}
        {Object.entries(activeFilters).map(([key, value]) => {
          if (!value || (typeof value === 'string' && value === 'all')) return null;
          if (typeof value === 'object' && !value.from && !value.to) return null;
          
          const filter = filters.find((f) => f.key === key);
          if (!filter) return null;

          return (
            <Badge key={key} variant="secondary" className="gap-1 pr-1">
              <span className="text-muted-foreground text-xs">{filter.label}:</span>
              <span className="text-xs">{getFilterLabel(filter, value)}</span>
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

  // Desktop: Use original Popover-based filter
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
            <FilterContent />
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

interface MobileDateRangePickerProps {
  value?: { from?: Date; to?: Date };
  onChange: (value: { from?: Date; to?: Date }) => void;
}

function MobileDateRangePicker({ value, onChange }: MobileDateRangePickerProps) {
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
              'flex-1 justify-start text-left font-normal h-10',
              !value?.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? format(value.from, 'MMM d') : 'From'}
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
              'flex-1 justify-start text-left font-normal h-10',
              !value?.to && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.to ? format(value.to, 'MMM d') : 'To'}
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
