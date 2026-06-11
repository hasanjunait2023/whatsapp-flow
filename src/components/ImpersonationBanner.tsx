import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ImpersonationBanner() {
  const { impersonatedTenant, isImpersonating, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating || !impersonatedTenant) {
    return null;
  }

  const handleExit = () => {
    stopImpersonation();
    navigate('/admin/tenants');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <AlertTriangle className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">
            Admin View: Viewing as <strong>"{impersonatedTenant.name}"</strong>
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExit}
          className="h-7 px-3 text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
}
