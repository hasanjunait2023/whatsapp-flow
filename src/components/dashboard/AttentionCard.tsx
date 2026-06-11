import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShoppingCart, AlertCircle, Wifi, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttentionItem {
  type: 'order' | 'complaint' | 'instance' | 'message';
  message: string;
  count: number;
  severity: 'warning' | 'error' | 'info';
}

interface AttentionCardProps {
  items: AttentionItem[];
  loading?: boolean;
}

export function AttentionCard({ items, loading }: AttentionCardProps) {
  const getIcon = (type: AttentionItem['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-4 w-4" />;
      case 'complaint':
        return <AlertCircle className="h-4 w-4" />;
      case 'instance':
        return <Wifi className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getSeverityStyles = (severity: AttentionItem['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'warning':
        return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Attention Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            Attention Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-600">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No items need your attention</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Attention Needed
          <Badge variant="destructive" className="ml-auto">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              getSeverityStyles(item.severity)
            )}
          >
            <div className="flex-shrink-0">
              {getIcon(item.type)}
            </div>
            <p className="text-sm font-medium flex-1">{item.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
