import { useState } from 'react';
import { Plus, LayoutGrid, Loader2, MoreHorizontal, Archive, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useServiceBoards } from '@/hooks/service-boards';
import { cn } from '@/lib/utils';

export default function ServiceBoards() {
  const { boards, isLoading, createBoard, deleteBoard, isCreating } = useServiceBoards();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    
    await createBoard({
      name: newBoardName.trim(),
      description: newBoardDescription.trim() || undefined,
    });
    
    setNewBoardName('');
    setNewBoardDescription('');
    setCreateDialogOpen(false);
  };

  const handleArchiveBoard = async (boardId: string) => {
    await deleteBoard(boardId);
  };

  // Board card colors for visual variety
  const boardColors = [
    'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    'from-green-500/20 to-green-600/10 border-green-500/30',
    'from-violet-500/20 to-violet-600/10 border-violet-500/30',
    'from-pink-500/20 to-pink-600/10 border-pink-500/30',
    'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <LayoutGrid className="h-6 w-6 text-primary" />
              Service Boards
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage service tasks with Kanban boards
            </p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Board
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Board</DialogTitle>
                <DialogDescription>
                  Create a new board to organize service tasks
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="board-name">Board Name</Label>
                  <Input
                    id="board-name"
                    placeholder="e.g., Customer Support, Onboarding"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="board-description">Description (optional)</Label>
                  <Textarea
                    id="board-description"
                    placeholder="What is this board for?"
                    value={newBoardDescription}
                    onChange={(e) => setNewBoardDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBoard} disabled={!newBoardName.trim() || isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Board
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && boards.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <LayoutGrid className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No boards yet</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-4">
                Create your first board to start organizing service tasks with a Kanban workflow.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Board
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Board Grid */}
        {!isLoading && boards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map((board, index) => (
              <Link
                key={board.id}
                to={`/service/boards/${board.id}`}
                className="block group"
              >
                <Card className={cn(
                  'h-40 bg-gradient-to-br border transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
                  boardColors[index % boardColors.length]
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                        {board.name}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.preventDefault();
                            handleArchiveBoard(board.id);
                          }}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive Board
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {board.description && (
                      <CardDescription className="line-clamp-2 text-xs">
                        {board.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{board.member_count || 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>{board.card_count || 0} cards</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Create New Board Card */}
            <Card
              className="h-40 border-dashed cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center"
              onClick={() => setCreateDialogOpen(true)}
            >
              <div className="text-center text-muted-foreground">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <span className="text-sm font-medium">Create Board</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
