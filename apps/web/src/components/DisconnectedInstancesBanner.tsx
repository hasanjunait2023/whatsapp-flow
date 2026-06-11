import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDisconnectedInstances } from '@/hooks/useDisconnectedInstances';
import { useState } from 'react';

export function DisconnectedInstancesBanner() {
  const { t } = useTranslation();
  const { disconnectedInstances, hasDisconnected, loading } = useDisconnectedInstances();
  const [dismissed, setDismissed] = useState(false);

  if (loading || !hasDisconnected || dismissed) {
    return null;
  }

  const instanceNames = disconnectedInstances
    .map(i => i.name || i.phone_number || 'Unknown')
    .slice(0, 3)
    .join(', ');
  
  const extraCount = disconnectedInstances.length - 3;

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5">
      <div className="flex items-center justify-between gap-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-destructive/20 flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <span className="font-medium text-destructive">
              {disconnectedInstances.length === 1 
                ? 'WhatsApp Instance Disconnected' 
                : `${disconnectedInstances.length} WhatsApp Instances Disconnected`}
            </span>
            <span className="text-muted-foreground ml-2">
              {instanceNames}
              {extraCount > 0 && ` +${extraCount} more`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            asChild 
            size="sm" 
            variant="destructive"
            className="h-8"
          >
            <Link to="/instances" className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              Reconnect
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
