import { useTeam } from '@/hooks/useTeam';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TeamMemberSelectorProps {
  value?: string;
  onChange: (userId: string, userName?: string) => void;
  label?: string;
  required?: boolean;
  excludeOwner?: boolean;
}

export default function TeamMemberSelector({
  value,
  onChange,
  label = 'Team Member',
  required = false,
  excludeOwner = false,
}: TeamMemberSelectorProps) {
  const { members, loading } = useTeam();

  const filteredMembers = excludeOwner 
    ? members.filter((m) => m.role !== 'owner')
    : members;

  const selectedMember = members.find((m) => m.user_id === value);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-amber-500/10 text-amber-500',
    manager: 'bg-blue-500/10 text-blue-500',
    agent: 'bg-emerald-500/10 text-emerald-500',
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select 
        value={value || ''} 
        onValueChange={(id) => {
          const member = members.find((m) => m.user_id === id);
          onChange(id, member?.profile?.full_name || member?.profile?.email || undefined);
        }} 
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? 'Loading...' : 'Select a team member'}>
            {selectedMember && (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={selectedMember.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(selectedMember.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {selectedMember.profile?.full_name || selectedMember.profile?.email || 'Unknown'}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filteredMembers.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No team members available
            </div>
          ) : (
            filteredMembers.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {member.profile?.full_name || member.profile?.email || 'Unknown'}
                    </span>
                  </div>
                  <Badge variant="secondary" className={roleColors[member.role]}>
                    {member.role}
                  </Badge>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
