import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, RefreshCw, AlertCircle } from 'lucide-react';

interface Instance {
  id: string;
  name: string;
  phone_number: string | null;
  status: string;
}

interface SyncGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instances: Instance[];
  onSync: (instanceId: string) => void;
  syncing: boolean;
}

export function SyncGroupsDialog({
  open,
  onOpenChange,
  instances,
  onSync,
  syncing,
}: SyncGroupsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>গ্রুপ সিঙ্ক করুন</DialogTitle>
          <DialogDescription>
            একটি হোয়াটসঅ্যাপ ইন্সট্যান্স নির্বাচন করুন যেখান থেকে গ্রুপ সিঙ্ক করতে চান
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {instances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground text-center">
                  কোনো সংযুক্ত হোয়াটসঅ্যাপ ইন্সট্যান্স নেই
                </p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  প্রথমে একটি হোয়াটসঅ্যাপ নম্বর সংযুক্ত করুন
                </p>
              </CardContent>
            </Card>
          ) : (
            instances.map((instance) => (
              <Card 
                key={instance.id} 
                className="hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => !syncing && onSync(instance.id)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Smartphone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{instance.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {instance.phone_number || 'নম্বর নেই'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    সংযুক্ত
                  </Badge>
                  <Button size="sm" disabled={syncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    সিঙ্ক
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
