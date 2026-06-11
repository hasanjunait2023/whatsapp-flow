import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanList } from './KanbanList';
import { KanbanCard } from './KanbanCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { ServiceList, ServiceCard, ServiceLabel, MoveCardInput } from '@/hooks/service-boards/types';

interface KanbanBoardProps {
  lists: ServiceList[];
  cardsByList: Record<string, ServiceCard[]>;
  labels: ServiceLabel[];
  onCardClick: (card: ServiceCard) => void;
  onCardMove: (input: MoveCardInput) => void;
  onQuickAddCard: (listId: string, title: string) => Promise<void>;
  onListRename: (listId: string, name: string) => void;
}

export function KanbanBoard({
  lists,
  cardsByList,
  labels,
  onCardClick,
  onCardMove,
  onQuickAddCard,
  onListRename,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<ServiceCard | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    if (activeData?.type === 'card') {
      setActiveCard(activeData.card);
      setActiveListId(activeData.card.list_id);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeCard) return;

    const overId = over.id as string;
    const overData = over.data.current;

    // Determine target list
    let targetListId: string | null = null;
    
    if (overData?.type === 'list') {
      targetListId = overId;
    } else if (overData?.type === 'card') {
      targetListId = overData.card.list_id;
    }

    if (targetListId && targetListId !== activeListId) {
      setActiveListId(targetListId);
    }
  }, [activeCard, activeListId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setActiveListId(null);

    if (!over || !active.data.current) return;

    const activeData = active.data.current;
    if (activeData.type !== 'card') return;

    const card = activeData.card as ServiceCard;
    const overId = over.id as string;
    const overData = over.data.current;

    // Determine target list and position
    let targetListId = card.list_id;
    let newPosition = card.position_numeric;

    if (overData?.type === 'list') {
      // Dropped on list - add to end
      targetListId = overId;
      const listCards = cardsByList[targetListId] || [];
      newPosition = listCards.length > 0
        ? Math.max(...listCards.map(c => c.position_numeric)) + 1000
        : 1000;
    } else if (overData?.type === 'card') {
      // Dropped on card - calculate position
      const overCard = overData.card as ServiceCard;
      targetListId = overCard.list_id;
      const listCards = cardsByList[targetListId] || [];
      const overIndex = listCards.findIndex(c => c.id === overCard.id);
      
      if (overIndex === 0) {
        newPosition = overCard.position_numeric / 2;
      } else if (overIndex > 0) {
        const prevCard = listCards[overIndex - 1];
        newPosition = (prevCard.position_numeric + overCard.position_numeric) / 2;
      }
    }

    // Only move if something changed
    if (targetListId !== card.list_id || newPosition !== card.position_numeric) {
      onCardMove({
        card_id: card.id,
        target_list_id: targetListId,
        new_position: newPosition,
      });
    }
  }, [cardsByList, onCardMove]);

  return (
    <ScrollArea className="h-full w-full">
      <div className="flex gap-4 p-4 h-full min-h-[calc(100vh-120px)]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={lists.map(l => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            {lists.map((list) => (
              <KanbanList
                key={list.id}
                list={list}
                cards={cardsByList[list.id] || []}
                labels={labels}
                onCardClick={onCardClick}
                onQuickAddCard={onQuickAddCard}
                onRename={(name) => onListRename(list.id, name)}
                isOver={activeListId === list.id && activeCard?.list_id !== list.id}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeCard && (
              <div className="opacity-80 rotate-3">
                <KanbanCard
                  card={activeCard}
                  labels={labels}
                  onClick={() => {}}
                  isDragging
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
