import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { m } from '@/lib/motion';
import { getInitials } from './teamTokens';

interface AdminMember {
  id: string;
  full_name: string;
  email: string;
}

interface TeamMemberCardProps {
  member: AdminMember;
  stats: { total: number; completed: number; pending: number };
}

/**
 * Admin roster card — avatar + identity + a compact task-load summary.
 * Tokens only; numbers use tabular-nums so the three columns align.
 */
export function TeamMemberCard({ member, stats }: TeamMemberCardProps) {
  return (
    <m.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-accent text-sm font-semibold text-primary">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{member.full_name || 'Unknown'}</p>
              <p className="truncate text-sm text-muted-foreground">{member.email}</p>
            </div>
            <Badge variant="neutral-soft" className="ml-auto shrink-0">
              Admin
            </Badge>
          </div>

          <div className="mt-auto grid grid-cols-3 divide-x divide-border rounded-control bg-muted-soft/60 py-3 text-center">
            <div>
              <p className="tabular-nums text-xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="tabular-nums text-xl font-bold text-success">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Done</p>
            </div>
            <div>
              <p className="tabular-nums text-xl font-bold text-warning">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}
