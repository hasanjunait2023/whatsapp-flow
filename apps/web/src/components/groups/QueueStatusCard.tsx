import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QueueItem, useGroupQueue } from '@/hooks/useGroupQueue';
import { Pause, Play, Trash2, Calendar, Users, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { toast } from 'sonner';

interface QueueStatusCardProps {
  queueItem: QueueItem;
}

export function QueueStatusCard({ queueItem }: QueueStatusCardProps) {
  const { pauseQueue, resumeQueue, cancelQueue, refetch } = useGroupQueue();

  const totalNumbers = queueItem.phone_numbers.length;
  const processed = queueItem.processed_count;
  const failed = queueItem.failed_count;
  const remaining = totalNumbers - processed - failed;
  const progress = (processed / totalNumbers) * 100;

  const getStatusBadge = () => {
    switch (queueItem.status) {
      case 'pending':
        return <Badge variant="secondary">অপেক্ষমান</Badge>;
      case 'processing':
        return <Badge variant="default">চলছে</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600">সম্পন্ন</Badge>;
      case 'failed':
        return <Badge variant="destructive">ব্যর্থ</Badge>;
      case 'paused':
        return <Badge variant="outline">বিরতি</Badge>;
      default:
        return null;
    }
  };

  const handlePause = async () => {
    try {
      await pauseQueue(queueItem.id);
      toast.success('সারি বিরতিতে আছে');
    } catch {
      toast.error('বিরতি দিতে সমস্যা হয়েছে');
    }
  };

  const handleResume = async () => {
    try {
      await resumeQueue(queueItem.id);
      toast.success('সারি আবার চালু হয়েছে');
    } catch {
      toast.error('চালু করতে সমস্যা হয়েছে');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelQueue(queueItem.id);
      toast.success('সারি বাতিল হয়েছে');
    } catch {
      toast.error('বাতিল করতে সমস্যা হয়েছে');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{queueItem.group?.name || 'অজানা গ্রুপ'}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(queueItem.scheduled_for), 'PPP', { locale: bn })}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>অগ্রগতি</span>
            <span>{processed}/{totalNumbers}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{remaining} বাকি</span>
            </div>
            {failed > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{failed} ব্যর্থ</span>
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>ব্যাচ: {queueItem.batch_size} জন</span>
          <span>বিরতি: {queueItem.interval_minutes} মিনিট</span>
        </div>

        {/* Actions */}
        {(queueItem.status === 'pending' || queueItem.status === 'processing' || queueItem.status === 'paused') && (
          <div className="flex gap-2">
            {queueItem.status === 'paused' ? (
              <Button variant="outline" size="sm" onClick={handleResume}>
                <Play className="h-4 w-4 mr-1" />
                চালু করুন
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handlePause}>
                <Pause className="h-4 w-4 mr-1" />
                বিরতি
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleCancel} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              বাতিল
            </Button>
          </div>
        )}

        {/* Error Log */}
        {queueItem.error_log && queueItem.error_log.length > 0 && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            সর্বশেষ ত্রুটি: {JSON.stringify(queueItem.error_log[queueItem.error_log.length - 1])}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
