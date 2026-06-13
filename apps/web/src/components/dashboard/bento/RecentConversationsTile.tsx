import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowRight, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useContacts } from "@/hooks/useContacts";

function initials(name: string | null, phone: string): string {
  const source = name?.trim() || phone;
  return source
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Recent Conversations table (DESIGN_SYSTEM §7) — restyled Table + status pills. */
export function RecentConversationsTile() {
  const { contacts, loading } = useContacts();

  const recent = useMemo(
    () => [...contacts].filter((c) => c.last_message_at).slice(0, 6),
    [contacts],
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-5 w-5 text-primary" aria-hidden />
          Recent Conversations
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/inbox">
            View inbox
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {loading ? (
          <div className="space-y-3 px-6 py-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
              <Inbox className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground">New messages will show up here.</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-transparent backdrop-blur-none">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Last message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((c) => {
                const name = c.name || c.phone_number;
                const hasUnread = c.unread_count > 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="py-3 pl-6">
                      <Link to="/inbox" className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {c.profile_pic_url && <AvatarImage src={c.profile_pic_url} alt={name} />}
                          <AvatarFallback className="bg-brand-light text-xs font-semibold text-primary">
                            {initials(c.name, c.phone_number)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{name}</p>
                          <p className="truncate text-xs text-muted-foreground md:hidden">{c.last_message || "—"}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden max-w-[220px] py-3 md:table-cell">
                      <p className="truncate text-sm text-muted-foreground">{c.last_message || "—"}</p>
                    </TableCell>
                    <TableCell className="py-3">
                      {c.needs_handoff ? (
                        <Badge variant="warning-soft">Needs reply</Badge>
                      ) : hasUnread ? (
                        <Badge variant="info-soft" className="tabular-nums">
                          {c.unread_count} unread
                        </Badge>
                      ) : (
                        <Badge variant="success-soft">Replied</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 pr-6 text-right">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {c.last_message_at
                          ? formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })
                          : "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
