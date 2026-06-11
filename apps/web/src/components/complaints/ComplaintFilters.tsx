import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ComplaintStatus, ComplaintPriority, ComplaintCategory } from '@/hooks/useComplaints';

interface ComplaintFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: ComplaintStatus | 'all';
  onStatusChange: (value: ComplaintStatus | 'all') => void;
  priority: ComplaintPriority | 'all';
  onPriorityChange: (value: ComplaintPriority | 'all') => void;
  category: ComplaintCategory | 'all';
  onCategoryChange: (value: ComplaintCategory | 'all') => void;
}

export function ComplaintFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  category,
  onCategoryChange,
}: ComplaintFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search complaints..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <Select value={status} onValueChange={(v) => onStatusChange(v as ComplaintStatus | 'all')}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priority} onValueChange={(v) => onPriorityChange(v as ComplaintPriority | 'all')}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>

      <Select value={category} onValueChange={(v) => onCategoryChange(v as ComplaintCategory | 'all')}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="product_issue">Product Issue</SelectItem>
          <SelectItem value="delivery">Delivery</SelectItem>
          <SelectItem value="refund">Refund</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
