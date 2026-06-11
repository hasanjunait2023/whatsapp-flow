import { useState } from 'react';
import { AdminWhatsAppInstance } from '@/hooks/useAdminOwnInstances';
import { Card, CardContent } from '@/components/ui/card';
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
  Link,
  Trash2,
  Star,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminInstanceCardProps {
  instance: AdminWhatsAppInstance;
  onConnect: (instance: AdminWhatsAppInstance) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export default function AdminInstanceCard({
  instance,
  onConnect,
  onDelete,
  onSetDefault,
}: AdminInstanceCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusBadge = () => {
    switch (instance.status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Connecting
          </Badge>
        );
      case 'banned':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Banned
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className={cn(
        'relative transition-all',
        instance.is_default && 'ring-2 ring-primary/50'
      )}>
        {instance.is_default && (
          <div className="absolute -top-2 -right-2">
            <Badge className="bg-primary text-primary-foreground gap-1">
              <Star className="h-3 w-3" />
              Default
            </Badge>
          </div>
        )}
        
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              'h-12 w-12 rounded-xl flex items-center justify-center',
              instance.status === 'active' ? 'bg-green-500/10' : 'bg-muted'
            )}>
              <Smartphone className={cn(
                'h-6 w-6',
                instance.status === 'active' ? 'text-green-600' : 'text-muted-foreground'
              )} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{instance.name}</h3>
                {getStatusBadge()}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {instance.phone_number || 'No phone number'}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {instance.status !== 'active' && (
                  <DropdownMenuItem onClick={() => onConnect(instance)}>
                    <Link className="h-4 w-4 mr-2" />
                    Connect
                  </DropdownMenuItem>
                )}
                {!instance.is_default && (
                  <DropdownMenuItem onClick={() => onSetDefault(instance.id)}>
                    <Star className="h-4 w-4 mr-2" />
                    Set as Default
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {instance.status !== 'active' && (
            <div className="mt-4">
              <Button
                onClick={() => onConnect(instance)}
                className="w-full"
                variant="outline"
              >
                <Link className="h-4 w-4 mr-2" />
                Connect WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{instance.name}"? This will disconnect the WhatsApp session. Your chat history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(instance.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
