import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WhatsAppGroup } from '@/hooks/useGroups';
import { Users, MessageSquare, Link2, Clock, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { m, hoverLift } from '@/lib/motion';

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
    <m.div {...hoverLift} className="h-full">
      <Card
        className="group h-full cursor-pointer rounded-card shadow-elevation-1 transition-colors hover:border-whatsapp/40"
        onClick={onSelect}
      >
        <CardContent className="flex h-full flex-col gap-4 p-5">
          {/* Header: avatar tile + name + sync time + admin pill */}
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-whatsapp-light text-whatsapp">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold leading-tight text-foreground">
                {group.name}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden />
                {syncedTime} সিঙ্ক হয়েছে
              </p>
            </div>
            {group.is_admin && (
              <Badge variant="success-soft" className="shrink-0">
                <Shield className="mr-1 h-3 w-3" aria-hidden />
                অ্যাডমিন
              </Badge>
            )}
          </div>

          {group.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {group.description}
            </p>
          )}

          {/* Member count + link status pills */}
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted-soft px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {group.participant_count} সদস্য
            </span>
            {group.invite_link && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                লিংক আছে
              </span>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <Users className="mr-1 h-4 w-4" />
              সদস্য দেখুন
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              মেসেজ পাঠান
            </Button>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}
