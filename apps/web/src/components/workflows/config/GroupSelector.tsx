import { useGroups } from '@/hooks/useGroups';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';

interface GroupSelectorProps {
  value?: string;
  onChange: (groupId: string, groupName?: string) => void;
  instanceId?: string;
  label?: string;
  required?: boolean;
}

export default function GroupSelector({
  value,
  onChange,
  instanceId,
  label = 'WhatsApp Group',
  required = false,
}: GroupSelectorProps) {
  const { groups, loading } = useGroups();
  const [search, setSearch] = useState('');

  // Filter groups by instance if provided
  const filteredGroups = useMemo(() => {
    let result = groups;
    
    if (instanceId) {
      result = result.filter((g) => g.instance_id === instanceId);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(searchLower));
    }
    
    return result;
  }, [groups, instanceId, search]);

  const selectedGroup = groups.find((g) => g.id === value);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select 
        value={value || ''} 
        onValueChange={(id) => {
          const group = groups.find((g) => g.id === id);
          onChange(id, group?.name);
        }} 
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? 'Loading...' : 'Select a group'}>
            {selectedGroup && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="truncate">{selectedGroup.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          {filteredGroups.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              {search ? 'No matching groups' : 'No groups available'}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({group.participant_count || 0})
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
