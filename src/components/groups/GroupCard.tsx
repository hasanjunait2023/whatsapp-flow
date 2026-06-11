import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WhatsAppGroup } from '@/hooks/useGroups';
import { Users, MessageSquare, Link2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';

interface GroupCardProps {
  group: WhatsAppGroup;
  onSelect: () => void;
}

export function GroupCard({ group, onSelect }: GroupCardProps) {
  const syncedTime = formatDistanceToNow(new Date(group.synced_at), {
    addSuffix: true,
    locale: bn,
  });

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{group.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              {syncedTime} সিঙ্ক হয়েছে
            </CardDescription>
          </div>
          {group.is_admin && (
            <Badge variant="secondary">অ্যাডমিন</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {group.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {group.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{group.participant_count} সদস্য</span>
          </div>
          {group.invite_link && (
            <div className="flex items-center gap-1.5 text-green-600">
              <Link2 className="h-4 w-4" />
              <span>লিংক আছে</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}>
            <Users className="h-4 w-4 mr-1" />
            সদস্য দেখুন
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}>
            <MessageSquare className="h-4 w-4 mr-1" />
            মেসেজ পাঠান
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
