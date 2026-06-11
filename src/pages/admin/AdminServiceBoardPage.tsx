import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServiceBoard } from '@/hooks/service-boards';
import { KanbanBoard } from '@/components/service-boards/KanbanBoard';
import { CardDetailDrawer } from '@/components/service-boards/CardDetailDrawer';
import { CreateListDialog } from '@/components/service-boards/CreateListDialog';
import type { ServiceCard } from '@/hooks/service-boards/types';

// System tenant ID for admin service boards
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

export default function AdminServiceBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const {
    board,
    lists,
    cards,
    labels,
    isLoading,
    error,
    role,
    createList,
    createCard,
    moveCard,
    updateCard,
    deleteCard,
    updateList,
    isCreatingList,
  } = useServiceBoard(boardId, SYSTEM_TENANT_ID);

  const [selectedCard, setSelectedCard] = useState<ServiceCard | null>(null);
  const [createListDialogOpen, setCreateListDialogOpen] = useState(false);

  // Group cards by list
  const cardsByList = useMemo(() => {
    const grouped: Record<string, ServiceCard[]> = {};
    lists.forEach(list => {
      grouped[list.id] = cards
        .filter(card => card.list_id === list.id)
        .sort((a, b) => a.position_numeric - b.position_numeric);
    });
    return grouped;
  }, [lists, cards]);

  const handleCardClick = (card: ServiceCard) => {
    setSelectedCard(card);
  };

  const handleCardClose = () => {
    setSelectedCard(null);
  };

  const handleCreateList = async (name: string) => {
    if (!boardId) return;
    await createList({ board_id: boardId, name });
    setCreateListDialogOpen(false);
  };

  const handleQuickAddCard = async (listId: string, title: string) => {
    if (!boardId) return;
    await createCard({
      board_id: boardId,
      list_id: listId,
      title,
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Board not found or you don't have access</p>
        <Button asChild>
          <Link to="/admin/service-boards">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Boards
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex flex-col overflow-hidden">
      {/* Board Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link to="/admin/service-boards">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{board.name}</h1>
              {board.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{board.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateListDialogOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add List</span>
            </Button>
            
            {(role === 'owner' || role === 'admin') && (
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          lists={lists}
          cardsByList={cardsByList}
          labels={labels}
          onCardClick={handleCardClick}
          onCardMove={moveCard}
          onQuickAddCard={handleQuickAddCard}
          onListRename={(listId, name) => updateList({ id: listId, name })}
        />
      </div>

      {/* Card Detail Drawer */}
      <CardDetailDrawer
        card={selectedCard}
        labels={labels}
        lists={lists}
        open={!!selectedCard}
        onClose={handleCardClose}
        onUpdateCard={updateCard}
        onDeleteCard={deleteCard}
        boardId={boardId || ''}
      />

      {/* Create List Dialog */}
      <CreateListDialog
        open={createListDialogOpen}
        onOpenChange={setCreateListDialogOpen}
        onCreateList={handleCreateList}
        isCreating={isCreatingList}
      />
    </div>
  );
}
