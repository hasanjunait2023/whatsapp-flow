import { X, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  disabled?: boolean;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: BulkActionsBarProps) {
  const isMobile = useIsMobile();

  if (selectedCount === 0) return null;

  // On mobile, show max 2 actions as icons, rest in dropdown
  const visibleActions = isMobile ? actions.slice(0, 2) : actions;
  const overflowActions = isMobile ? actions.slice(2) : [];

  return (
    <div
      className={cn(
        'fixed z-50',
        'bg-background border border-border rounded-lg shadow-lg',
        'animate-in slide-in-from-bottom-5 duration-200',
        // Mobile: full width at bottom with safe area
        isMobile 
          ? 'bottom-0 left-0 right-0 mx-4 mb-4 rounded-xl' 
          : 'bottom-6 left-1/2 -translate-x-1/2',
        className
      )}
    >
      <div className={cn(
        'flex items-center gap-2 px-3 py-2.5',
        isMobile ? 'justify-between' : 'gap-3 px-4 py-3'
      )}>
        {/* Selection count */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            'font-medium text-foreground',
            isMobile ? 'text-xs' : 'text-sm'
          )}>
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Separator - desktop only */}
        {!isMobile && (
          <div className="h-6 w-px bg-border" />
        )}

        {/* Actions */}
        {isMobile ? (
          <div className="flex items-center gap-1">
            {/* Show first 2 actions as icon buttons */}
            <TooltipProvider>
              {visibleActions.map((action, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={action.variant || 'secondary'}
                      size="sm"
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className="h-9 w-9 p-0"
                    >
                      {action.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {action.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>

            {/* Overflow menu */}
            {overflowActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="h-9 w-9 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {overflowActions.map((action, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={action.variant === 'destructive' ? 'text-destructive' : ''}
                    >
                      {action.icon}
                      <span className="ml-2">{action.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ) : (
          <ScrollArea className="max-w-[600px]">
            <div className="flex items-center gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'secondary'}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="gap-2 whitespace-nowrap"
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
