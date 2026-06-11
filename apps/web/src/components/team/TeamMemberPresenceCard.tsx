import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PresenceIndicator } from '@/components/ui/presence-indicator';
import { Crown, Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamMemberPresence } from '@/hooks/useTeamPresence';

interface TeamMemberPresenceCardProps {
  member: TeamMemberPresence;
  compact?: boolean;
  showRole?: boolean;
  className?: string;
}

const roleConfig = {
  owner: { label: 'Owner', icon: Crown, className: 'bg-warning/10 text-warning border-warning/20' },
  manager: { label: 'Manager', icon: Shield, className: 'bg-primary/10 text-primary border-primary/20' },
  agent: { label: 'Agent', icon: User, className: 'bg-muted text-muted-foreground' },
};

export function TeamMemberPresenceCard({ 
  member, 
  compact = false,
  showRole = false,
  className 
}: TeamMemberPresenceCardProps) {
  const role = roleConfig[member.role];
  const RoleIcon = role.icon;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative">
          <Avatar className="h-7 w-7">
            <AvatarImage src={member.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {member.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <PresenceIndicator 
            status={member.status} 
            size="sm"
            className="absolute -bottom-0.5 -right-0.5"
            showPulse={false}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{member.name}</p>
          {member.current_page && (
            <p className="text-xs text-muted-foreground truncate">{member.current_page}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between py-3", className)}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {member.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <PresenceIndicator 
            status={member.status} 
            size="md"
            className="absolute -bottom-0.5 -right-0.5"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{member.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {member.status === 'online' && member.current_page 
              ? `${member.last_seen_text} • ${member.current_page}`
              : member.last_seen_text
            }
          </p>
        </div>
      </div>
      {showRole && (
        <Badge className={role.className}>
          <RoleIcon className="h-3 w-3 mr-1" />
          {role.label}
        </Badge>
      )}
    </div>
  );
}
