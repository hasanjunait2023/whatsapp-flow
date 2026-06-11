import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  CheckCircle2, 
  CreditCard, 
  Eye, 
  Settings, 
  UserCog,
  Trash2,
  Plus,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import type { CustomerAuditLog } from '@/hooks/useCustomerDetails';

interface AuditLogTabProps {
  auditLogs: CustomerAuditLog[];
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'activate':
    case 'activate_subscription':
      return CheckCircle2;
    case 'verify_payment':
    case 'payment':
      return CreditCard;
    case 'impersonate':
    case 'view':
      return Eye;
    case 'update':
    case 'edit':
      return Edit;
    case 'delete':
      return Trash2;
    case 'create':
      return Plus;
    case 'settings':
    case 'configure':
      return Settings;
    case 'grant_role':
    case 'revoke_role':
      return UserCog;
    default:
      return Shield;
  }
};

const getActionColor = (action: string) => {
  if (action.includes('delete') || action.includes('revoke')) {
    return 'text-destructive bg-destructive/10';
  }
  if (action.includes('activate') || action.includes('verify') || action.includes('create')) {
    return 'text-success bg-success/10';
  }
  if (action.includes('view') || action.includes('impersonate')) {
    return 'text-blue-500 bg-blue-500/10';
  }
  return 'text-muted-foreground bg-muted';
};

const formatActionLabel = (action: string) => {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

export function AuditLogTab({ auditLogs }: AuditLogTabProps) {
  if (auditLogs.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg">No Admin Actions</h3>
        <p className="text-muted-foreground">Admin actions on this customer will be logged here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Showing the last {auditLogs.length} admin actions on this customer.
      </p>

      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {auditLogs.map((log) => {
            const Icon = getActionIcon(log.action);
            const colorClass = getActionColor(log.action);

            return (
              <div key={log.id} className="flex gap-4">
                <div className={`p-2 rounded-full h-fit ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {log.admin_name || log.admin_email || 'System'}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {formatActionLabel(log.action)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {Object.entries(log.details).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-medium">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
