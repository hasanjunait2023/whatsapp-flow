import { useState, useMemo } from 'react';
import { Plus, LayoutGrid, Loader2, MoreHorizontal, Archive, Users, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useServiceBoards } from '@/hooks/service-boards';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';

// System tenant ID for admin service boards
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

export default function AdminServiceBoards() {
  const { boards, isLoading, createBoard, deleteBoard, isCreating } = useServiceBoards(SYSTEM_TENANT_ID);
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

  // Derived board metrics (presentation only — same hook data).
  const boardStats = useMemo(() => {
    const totalCards = boards.reduce((sum, b) => sum + (b.card_count || 0), 0);
    const totalMembers = boards.reduce((sum, b) => sum + (b.member_count || 1), 0);
    return { boards: boards.length, totalCards, totalMembers };
  }, [boards]);

  return (
    <m.div
      variants={pageEnter}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
    >
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Service Boards</h1>
          <p className="text-sm text-muted-foreground">
            Manage service tasks with Kanban boards
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px] gap-2 self-start sm:min-h-0 sm:self-auto">
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
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Board
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* KPI strip — ONE orange focal tile (boards) + calm neutral stats */}
      <m.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5"
      >
        {/* The single orange surface for this page */}
        <m.div variants={staggerItem} className="h-full">
          <Card className="h-full border-0 bg-primary text-primary-foreground shadow-elevation-accent">
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-primary-foreground/80">Active boards</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15">
                  <LayoutGrid className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <p className="text-2xl font-bold leading-none tracking-tight tabular-nums md:text-3xl">
                {boardStats.boards}
              </p>
              <p className="mt-auto text-xs text-primary-foreground/70">Kanban workspaces in service ops</p>
            </CardContent>
          </Card>
        </m.div>

        <m.div variants={staggerItem} className="h-full">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">Total cards</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-soft text-info">
                  <Layers className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <p className="text-2xl font-bold leading-none tracking-tight tabular-nums md:text-3xl">
                {boardStats.totalCards.toLocaleString()}
              </p>
              <p className="mt-auto text-xs text-muted-foreground">Tasks tracked across all boards</p>
            </CardContent>
          </Card>
        </m.div>

        <m.div variants={staggerItem} className="h-full">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">Members</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft text-success">
                  <Users className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <p className="text-2xl font-bold leading-none tracking-tight tabular-nums md:text-3xl">
                {boardStats.totalMembers.toLocaleString()}
              </p>
              <p className="mt-auto text-xs text-muted-foreground">Collaborators with board access</p>
            </CardContent>
          </Card>
        </m.div>
      </m.div>

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
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
              <LayoutGrid className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No boards yet</h3>
            <p className="mb-4 max-w-sm text-center text-muted-foreground">
              Create your first board to start organizing service tasks with a Kanban workflow.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="min-h-[44px] gap-2 sm:min-h-0">
              <Plus className="h-4 w-4" />
              Create Your First Board
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Board Grid */}
      {!isLoading && boards.length > 0 && (
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-5"
        >
          {boards.map((board) => (
            <m.div key={board.id} variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
              <Link
                to={`/admin/service-boards/${board.id}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-card"
              >
                <Card className="h-44 transition-shadow duration-200 hover:shadow-elevation-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                          <LayoutGrid className="h-4 w-4" aria-hidden />
                        </span>
                        <CardTitle className="line-clamp-1 text-base transition-colors group-hover:text-primary">
                          {board.name}
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              handleArchiveBoard(board.id);
                            }}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive Board
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {board.description && (
                      <CardDescription className="line-clamp-2 pt-1 text-xs">
                        {board.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-end pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral-soft" className="gap-1.5">
                        <Users className="h-3 w-3" aria-hidden />
                        <span className="tabular-nums">{board.member_count || 1}</span>
                      </Badge>
                      <Badge variant="info-soft" className="gap-1.5">
                        <LayoutGrid className="h-3 w-3" aria-hidden />
                        <span className="tabular-nums">{board.card_count || 0}</span> cards
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </m.div>
          ))}

          {/* Create New Board Card */}
          <m.div variants={staggerItem}>
            <Card
              className="flex h-44 cursor-pointer items-center justify-center border-dashed transition-colors duration-200 hover:border-primary/50 hover:bg-accent/40"
              onClick={() => setCreateDialogOpen(true)}
            >
              <div className="text-center text-muted-foreground">
                <Plus className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <span className="text-sm font-medium">Create Board</span>
              </div>
            </Card>
          </m.div>
        </m.div>
      )}
    </m.div>
  );
}
