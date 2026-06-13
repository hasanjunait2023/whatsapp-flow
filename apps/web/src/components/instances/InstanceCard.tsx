import { useState } from 'react';
import { WhatsAppInstance } from '@/hooks/useInstances';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Smartphone, 
  MoreVertical, 
  Star, 
  StarOff, 
  Trash2, 
  RefreshCw,
  Settings,
  Wifi,
  WifiOff,
  AlertTriangle,
  Copy,
  Check,
  Link2,
  QrCode,
  Phone,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { m, staggerItem } from '@/lib/motion';
import ConnectQRDialog from './ConnectQRDialog';
import ChangeNumberDialog from './ChangeNumberDialog';

interface InstanceCardProps {
  instance: WhatsAppInstance;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

type BadgeVariant = 'success-soft' | 'neutral-soft' | 'destructive-soft';

const statusConfig: Record<
  WhatsAppInstance['status'],
  { label: string; icon: typeof Wifi; variant: BadgeVariant; dot: string }
> = {
  active: {
    label: 'Connected',
    icon: Wifi,
    variant: 'success-soft',
    dot: 'bg-success',
  },
  disconnected: {
    label: 'Disconnected',
    icon: WifiOff,
    variant: 'neutral-soft',
    dot: 'bg-muted-foreground',
  },
  banned: {
    label: 'Banned',
    icon: AlertTriangle,
    variant: 'destructive-soft',
    dot: 'bg-destructive',
  },
};

export default function InstanceCard({ instance, onSetDefault, onDelete, onRefresh }: InstanceCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [changeNumberDialogOpen, setChangeNumberDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const status = statusConfig[instance.status];
  const StatusIcon = status.icon;
  const isConnected = instance.status === 'active';

  const webhookUrl = `${window.location.origin}/api/waha/webhook/${instance.id}`;

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast({
        title: 'Webhook URL copied!',
        description: 'Paste this in your WasenderAPI webhook settings.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the URL manually.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = () => {
    onDelete(instance.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <Card
        className={cn(
          'h-full rounded-card shadow-elevation-1 transition-shadow hover:shadow-elevation-2',
          // Connected instances carry a faint channel-coloured ring/wash (the only place the
          // whatsapp token surfaces on this page) so a live session reads at a glance.
          isConnected && 'border-whatsapp/30 ring-1 ring-whatsapp/10',
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-whatsapp/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-whatsapp" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{instance.name}</CardTitle>
                {instance.is_default && (
                  <Badge variant="neutral-soft" className="gap-1 text-xs text-primary">
                    <Star className="h-3 w-3 fill-current" />
                    Default
                  </Badge>
                )}
              </div>
              {instance.phone_number && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {instance.phone_number}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Edit Instance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </DropdownMenuItem>
              {instance.status !== 'active' && (
                <DropdownMenuItem onClick={() => setConnectDialogOpen(true)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Reconnect
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setChangeNumberDialogOpen(true)}>
                <Phone className="mr-2 h-4 w-4" />
                Change Number
              </DropdownMenuItem>
              {!instance.is_default && (
                <DropdownMenuItem onClick={() => onSetDefault(instance.id)}>
                  <Star className="mr-2 h-4 w-4" />
                  Set as Default
                </DropdownMenuItem>
              )}
              {instance.is_default && (
                <DropdownMenuItem disabled>
                  <StarOff className="mr-2 h-4 w-4" />
                  Remove Default
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
              <Trash2 className="mr-2 h-4 w-4" />
                Delete WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant={status.variant} className="gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} aria-hidden />
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            {instance.status !== 'active' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setConnectDialogOpen(true)}
                className="h-7 text-xs gap-1.5 border-whatsapp/30 text-whatsapp hover:bg-whatsapp/10 hover:text-whatsapp"
              >
                <QrCode className="h-3.5 w-3.5" />
                Connect
              </Button>
            )}
            {instance.status === 'active' && (
              <p className="text-xs text-muted-foreground">
                {instance.last_connected_at
                  ? `Last active ${formatDistanceToNow(new Date(instance.last_connected_at), { addSuffix: true })}`
                  : `Created ${formatDistanceToNow(new Date(instance.created_at), { addSuffix: true })}`}
              </p>
            )}
          </div>
          
          {/* Webhook URL Section */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <Link2 className="h-3 w-3" />
              <span>Webhook URL</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted/50 px-2 py-1.5 rounded truncate font-mono">
                {webhookUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 shrink-0"
                onClick={handleCopyWebhook}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </m.div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove WhatsApp Instance</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                Are you sure you want to remove "{instance.name}"?
              </span>
              <span className="block text-sm text-muted-foreground bg-success/10 border border-success/20 rounded-lg p-3">
                ✓ All customer contacts, chat history, and orders will be preserved and remain accessible in your inbox.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Instance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConnectQRDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        instance={instance}
        onConnected={onRefresh}
      />

      <ChangeNumberDialog
        open={changeNumberDialogOpen}
        onOpenChange={setChangeNumberDialogOpen}
        instance={instance}
        onSuccess={() => {
          setConnectDialogOpen(true);
          onRefresh();
        }}
      />
    </>
  );
}
