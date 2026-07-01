import { useState, useEffect } from 'react';
import { X, Calendar, Tag, User, MessageSquare, CheckSquare, Paperclip, Clock, Trash2, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ServiceCard, ServiceLabel, ServiceList } from '@/hooks/service-boards/types';

interface CardDetailDrawerProps {
  card: ServiceCard | null;
  labels: ServiceLabel[];
  lists: ServiceList[];
  open: boolean;
  onClose: () => void;
  onUpdateCard: (data: Partial<ServiceCard> & { id: string }) => Promise<ServiceCard>;
  onDeleteCard: (cardId: string) => Promise<void>;
  boardId: string;
}

export function CardDetailDrawer({
  card,
  labels,
  lists,
  open,
  onClose,
  onUpdateCard,
  onDeleteCard,
}: CardDetailDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
    }
  }, [card]);

  if (!card) return null;

  const handleTitleSave = async () => {
    if (title.trim() && title !== card.title) {
      await onUpdateCard({ id: card.id, title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = async () => {
    if (description !== (card.description || '')) {
      await onUpdateCard({ id: card.id, description: description || null });
    }
    setIsEditingDescription(false);
  };

  const handlePriorityChange = async (priority: ServiceCard['priority']) => {
    await onUpdateCard({ id: card.id, priority });
  };

  const handleStatusChange = async (status: ServiceCard['status']) => {
    await onUpdateCard({ id: card.id, status });
  };

  const handleListChange = async (listId: string) => {
    await onUpdateCard({ id: card.id, list_id: listId });
  };

  const handleDelete = async () => {
    await onDeleteCard(card.id);
    onClose();
  };

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-gray-400' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
    { value: 'high', label: 'High', color: 'bg-violet-500' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  ];

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
    { value: 'blocked', label: 'Blocked' },
  ];

  const currentList = lists.find(l => l.id === card.list_id);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-start justify-between">
            {isEditingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') {
                    setTitle(card.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="text-lg font-semibold"
                autoFocus
              />
            ) : (
              <SheetTitle
                className="text-lg cursor-pointer hover:text-primary transition-colors pr-8"
                onClick={() => setIsEditingTitle(true)}
              >
                {card.title}
              </SheetTitle>
            )}
            
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Card
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            in list <span className="font-medium text-foreground">{currentList?.name}</span>
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            {/* List */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">List</label>
              <Select value={card.list_id} onValueChange={handleListChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <Select value={card.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', option.color)} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={card.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Due Date</label>
              <Input
                type="date"
                value={card.due_date ? format(new Date(card.due_date), 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const value = e.target.value ? new Date(e.target.value).toISOString() : null;
                  onUpdateCard({ id: card.id, due_date: value });
                }}
                className="h-9"
              />
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Description</label>
            </div>
            {isEditingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a more detailed description..."
                  rows={4}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleDescriptionSave}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDescription(card.description || '');
                      setIsEditingDescription(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'min-h-[80px] p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors',
                  !description && 'text-muted-foreground'
                )}
                onClick={() => setIsEditingDescription(true)}
              >
                {description || 'Add a more detailed description...'}
              </div>
            )}
          </div>

          {/* Labels */}
          {(card.labels?.length ?? 0) > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Labels</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {card.labels?.map((label) => (
                    <Badge
                      key={label.id}
                      style={{ backgroundColor: label.color }}
                      className="text-white"
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Metadata */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Created {format(new Date(card.created_at), 'PPP')}</p>
            {card.updated_at !== card.created_at && (
              <p>Updated {format(new Date(card.updated_at), 'PPP')}</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
