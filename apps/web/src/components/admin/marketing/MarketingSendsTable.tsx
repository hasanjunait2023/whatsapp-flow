import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, MessageSquare, Mail, AlertCircle, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

interface MarketingSend {
  id: string;
  enrollment_id: string;
  sequence_id: string;
  channel: string;
  status: string;
  content: { message?: string; subject?: string; body?: string };
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  retry_count: number;
  retry_after: string | null;
  sequence?: {
    name: string;
    week_number: number;
  };
  enrollment?: {
    entity_type: string;
    entity_id: string;
  };
}

export default function MarketingSendsTable() {
  const [sends, setSends] = useState<MarketingSend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSends = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_marketing_sends')
        .select(`
          *,
          sequence:admin_marketing_sequences(name, week_number),
          enrollment:admin_marketing_enrollments(entity_type, entity_id)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSends((data || []) as unknown as MarketingSend[]);
    } catch (error) {
      console.error('Error fetching sends:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSends();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            পাঠানো হয়েছে
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            পেন্ডিং
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            ব্যর্থ
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'whatsapp' ? (
      <MessageSquare className="h-4 w-4 text-primary" />
    ) : (
      <Mail className="h-4 w-4 text-secondary-foreground" />
    );
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">সাম্প্রতিক Sends</h3>
        <Button variant="outline" size="sm" onClick={fetchSends}>
          <RefreshCw className="h-4 w-4 mr-2" />
          রিফ্রেশ
        </Button>
      </div>

      {sends.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>কোনো send নেই</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>চ্যানেল</TableHead>
                <TableHead>সিকোয়েন্স</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>Retry</TableHead>
                <TableHead>সময়</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sends.map((send) => (
                <TableRow key={send.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(send.channel)}
                      <span className="capitalize">{send.channel}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {send.sequence?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        সপ্তাহ {send.sequence?.week_number || '-'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(send.status)}</TableCell>
                  <TableCell>
                    {send.retry_count > 0 ? (
                      <div className="flex items-center gap-1 text-destructive">
                        <RotateCcw className="h-3 w-3" />
                        <span className="text-xs">{send.retry_count}/3</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {send.sent_at
                        ? format(new Date(send.sent_at), 'dd/MM HH:mm')
                        : format(new Date(send.created_at), 'dd/MM HH:mm')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {send.error_message ? (
                      <span className="text-xs text-destructive truncate max-w-[150px] block">
                        {send.error_message}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
