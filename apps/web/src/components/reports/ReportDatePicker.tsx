import { useState } from 'react';
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

type PresetPeriod = 'this_month' | 'last_7_days' | 'last_30_days' | 'last_3_months' | 'custom';

interface ReportDatePickerProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
}

const presets: { value: PresetPeriod; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' },
];

export function ReportDatePicker({ startDate, endDate, onDateChange }: ReportDatePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetPeriod>('this_month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });

  const handlePresetChange = (value: PresetPeriod) => {
    setSelectedPreset(value);
    const today = new Date();

    switch (value) {
      case 'this_month': {
        const from = startOfMonth(today);
        const to = endOfMonth(today);
        setDateRange({ from, to });
        onDateChange(from, to);
        break;
      }
      case 'last_7_days': {
        const from = subDays(today, 7);
        setDateRange({ from, to: today });
        onDateChange(from, today);
        break;
      }
      case 'last_30_days': {
        const from = subDays(today, 30);
        setDateRange({ from, to: today });
        onDateChange(from, today);
        break;
      }
      case 'last_3_months': {
        const from = subMonths(today, 3);
        setDateRange({ from, to: today });
        onDateChange(from, today);
        break;
      }
      case 'custom':
        break;
    }
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setSelectedPreset('custom');
      onDateChange(range.from, range.to);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedPreset} onValueChange={(v) => handlePresetChange(v as PresetPeriod)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                </>
              ) : (
                format(dateRange.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
