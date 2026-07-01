import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, Paperclip, CheckSquare, User } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ServiceCard, ServiceLabel } from '@/hooks/service-boards/types';

interface KanbanCardProps {
  card: ServiceCard;
  labels: ServiceLabel[];
  onClick: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ card, labels, onClick, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardLabels = card.labels || [];
  const hasDueDate = !!card.due_date;
  const dueDate = hasDueDate ? new Date(card.due_date!) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && card.status !== 'done';
  const isDueToday = dueDate && isToday(dueDate);

  const priorityColors = {
    urgent: 'border-l-red-500',
    high: 'border-l-violet-500',
    medium: 'border-l-blue-500',
    low: 'border-l-gray-400',
  };

  if (isSortableDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-20 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5"
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 bg-card',
        priorityColors[card.priority],
        isDragging && 'shadow-lg',
        card.status === 'done' && 'opacity-60'
      )}
    >
      {/* Labels */}
      {cardLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {cardLabels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="h-2 w-8 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
          {cardLabels.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{cardLabels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <h4 className={cn(
        'text-sm font-medium line-clamp-2 mb-2',
        card.status === 'done' && 'line-through'
      )}>
        {card.title}
      </h4>

      {/* Metadata Row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {/* Due Date */}
          {hasDueDate && (
            <div className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded',
              isOverdue && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              isDueToday && !isOverdue && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            )}>
              <Calendar className="h-3 w-3" />
              <span>{format(dueDate!, 'MMM d')}</span>
            </div>
          )}

          {/* Comment count */}
          {(card.comment_count ?? 0) > 0 && (
            <div className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              <span>{card.comment_count}</span>
            </div>
          )}

          {/* Attachment count */}
          {(card.attachment_count ?? 0) > 0 && (
            <div className="flex items-center gap-0.5">
              <Paperclip className="h-3 w-3" />
              <span>{card.attachment_count}</span>
            </div>
          )}

          {/* Checklist count */}
          {(card.checklist_count ?? 0) > 0 && (
            <div className="flex items-center gap-0.5">
              <CheckSquare className="h-3 w-3" />
              <span>{card.checklist_count}</span>
            </div>
          )}
        </div>

        {/* Assignee */}
        {card.assigned_to && (
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </Card>
  );
}
