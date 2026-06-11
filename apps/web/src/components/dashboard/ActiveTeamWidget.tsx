import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTeamPresence } from '@/hooks/useTeamPresence';
import { TeamMemberPresenceCard } from '@/components/team/TeamMemberPresenceCard';

interface ActiveTeamWidgetProps {
  className?: string;
}

export function ActiveTeamWidget({ className }: ActiveTeamWidgetProps) {
  const { onlineMembers, awayMembers, offlineMembers, activeCount, totalCount, loading } = useTeamPresence();
  const [showOffline, setShowOffline] = useState(false);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-12" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Status
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {activeCount}/{totalCount} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[280px]">
          {/* Online Members */}
          {onlineMembers.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Online ({onlineMembers.length})
                </span>
              </div>
              <div className="space-y-1">
                {onlineMembers.map(member => (
                  <TeamMemberPresenceCard 
                    key={member.user_id} 
                    member={member} 
                    compact 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Away Members */}
          {awayMembers.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Away ({awayMembers.length})
                </span>
              </div>
              <div className="space-y-1">
                {awayMembers.map(member => (
                  <TeamMemberPresenceCard 
                    key={member.user_id} 
                    member={member} 
                    compact 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Offline Members - Collapsible */}
          {offlineMembers.length > 0 && (
            <div>
              <button
                onClick={() => setShowOffline(!showOffline)}
                className="flex items-center gap-2 mb-2 w-full text-left hover:opacity-80 transition-opacity"
              >
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span className="text-xs font-medium text-muted-foreground flex-1">
                  Offline ({offlineMembers.length})
                </span>
                {showOffline ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
              {showOffline && (
                <div className="space-y-1">
                  {offlineMembers.map(member => (
                    <TeamMemberPresenceCard 
                      key={member.user_id} 
                      member={member} 
                      compact 
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {totalCount === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No team members yet</p>
              <Button variant="link" size="sm" asChild className="mt-1">
                <Link to="/team">Add team members</Link>
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
