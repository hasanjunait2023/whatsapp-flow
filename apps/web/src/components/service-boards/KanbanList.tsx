import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import type { ServiceList, ServiceCard, ServiceLabel } from '@/hooks/service-boards/types';

interface KanbanListProps {
  list: ServiceList;
  cards: ServiceCard[];
  labels: ServiceLabel[];
  onCardClick: (card: ServiceCard) => void;
  onQuickAddCard: (listId: string, title: string) => Promise<void>;
  onRename: (name: string) => void;
  isOver?: boolean;
}

export function KanbanList({
  list,
  cards,
  labels,
  onCardClick,
  onQuickAddCard,
  onRename,
  isOver,
}: KanbanListProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: list.id,
    data: {
      type: 'list',
      list,
    },
  });

  const handleRename = () => {
    if (editName.trim() && editName !== list.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim() || isCreating) return;
    
    setIsCreating(true);
    try {
      await onQuickAddCard(list.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(false);
    } finally {
      setIsCreating(false);
    }
  };

  const showDropIndicator = isOver || isDroppableOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 bg-muted/50 rounded-xl border border-border/50 flex flex-col max-h-[calc(100vh-140px)]',
        showDropIndicator && 'ring-2 ring-primary/50 bg-primary/5'
      )}
    >
      {/* List Header */}
      <div className="p-3 flex items-center justify-between border-b border-border/30">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditName(list.name);
                setIsEditing(false);
              }
            }}
            className="h-7 text-sm font-medium"
            autoFocus
          />
        ) : (
          <h3
            className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {list.name}
            <span className="ml-2 text-muted-foreground font-normal">
              {cards.length}
            </span>
          </h3>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              Rename List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsAddingCard(true)}>
              Add Card
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext
          items={cards.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              labels={labels}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>

        {/* Quick Add Card Form */}
        {isAddingCard && (
          <div className="space-y-2">
            <Input
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Enter card title..."
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCard();
                if (e.key === 'Escape') {
                  setNewCardTitle('');
                  setIsAddingCard(false);
                }
              }}
              autoFocus
              disabled={isCreating}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddCard}
                disabled={!newCardTitle.trim() || isCreating}
                className="flex-1"
              >
                Add Card
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNewCardTitle('');
                  setIsAddingCard(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Card Button */}
      {!isAddingCard && (
        <div className="p-2 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground gap-2"
            onClick={() => setIsAddingCard(true)}
          >
            <Plus className="h-4 w-4" />
            Add a card
          </Button>
        </div>
      )}
    </div>
  );
}
