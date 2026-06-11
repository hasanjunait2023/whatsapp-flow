import AdminLayout from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Plus, Loader2, ListTodo, KanbanSquare, Trash2, Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useAdminTasks, AdminTask } from '@/hooks/useAdminTasks';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDataCard } from '@/components/admin/MobileDataCard';

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const statusIcons: Record<string, React.ReactNode> = {
  todo: <Circle className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Clock className="h-4 w-4 text-yellow-500" />,
  done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

export default function AdminTeam() {
  const { tasks, loading, createTask, updateTaskStatus, deleteTask } = useAdminTasks();
  const [admins, setAdmins] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAdmins = async () => {
      const { data } = await supabase
        .from('system_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        setAdmins(profiles || []);
      }
    };
    fetchAdmins();
  }, []);

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    setIsSubmitting(true);
    await createTask({
      ...newTask,
      assigned_to: newTask.assigned_to || undefined,
      due_date: newTask.due_date || undefined,
    });
    setNewTask({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' });
    setCreateDialogOpen(false);
    setIsSubmitting(false);
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const getAdminStats = (adminId: string) => {
    const adminTasks = tasks.filter(t => t.assigned_to === adminId);
    return {
      total: adminTasks.length,
      completed: adminTasks.filter(t => t.status === 'done').length,
      pending: adminTasks.filter(t => t.status !== 'done').length,
    };
  };

  // Mobile Task Card
  const renderTaskCard = (task: AdminTask) => (
    <MobileDataCard
      key={task.id}
      data={task}
      header={
        <div className="space-y-1">
          <p className="font-medium text-sm line-clamp-2">{task.title}</p>
          {task.assignee_name && (
            <p className="text-xs text-muted-foreground">{task.assignee_name}</p>
          )}
        </div>
      }
      fields={[
        {
          key: 'priority',
          label: 'Priority',
          render: (data) => (
            <Badge variant="outline" className="flex items-center gap-1 w-fit">
              <span className={`h-1.5 w-1.5 rounded-full ${priorityColors[data.priority]}`} />
              {data.priority}
            </Badge>
          ),
        },
        {
          key: 'due_date',
          label: 'Due',
          render: (data) => data.due_date ? format(new Date(data.due_date), 'MMM d') : '-',
        },
      ]}
      actions={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => setDeleteTaskId(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      }
    />
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin Team</h1>
            <p className="text-muted-foreground text-sm">
              Manage admin team members and tasks
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
                <DialogDescription>
                  Create a new task for the admin team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Task description..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select
                      value={newTask.assigned_to}
                      onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select admin" />
                      </SelectTrigger>
                      <SelectContent>
                        {admins.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id}>
                            {admin.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleCreateTask} disabled={isSubmitting || !newTask.title.trim()} className="w-full sm:w-auto">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="tasks" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
            <TabsList className="inline-flex min-w-max">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <KanbanSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Task Board</span>
                <span className="sm:hidden">Board</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                <span className="hidden sm:inline">Task List</span>
                <span className="sm:hidden">List</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Team Members</span>
                <span className="sm:hidden">Team</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tasks" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Todo Column */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Circle className="h-4 w-4 text-muted-foreground" />
                      To Do
                      <Badge variant="secondary" className="ml-auto">{todoTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {todoTasks.map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onStatusChange={updateTaskStatus}
                        onDelete={() => setDeleteTaskId(task.id)}
                      />
                    ))}
                    {todoTasks.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No tasks</p>
                    )}
                  </CardContent>
                </Card>

                {/* In Progress Column */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      In Progress
                      <Badge variant="secondary" className="ml-auto">{inProgressTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {inProgressTasks.map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onStatusChange={updateTaskStatus}
                        onDelete={() => setDeleteTaskId(task.id)}
                      />
                    ))}
                    {inProgressTasks.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No tasks</p>
                    )}
                  </CardContent>
                </Card>

                {/* Done Column */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Done
                      <Badge variant="secondary" className="ml-auto">{doneTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {doneTasks.slice(0, 10).map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onStatusChange={updateTaskStatus}
                        onDelete={() => setDeleteTaskId(task.id)}
                      />
                    ))}
                    {doneTasks.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No tasks</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardContent className="p-0">
                {isMobile ? (
                  // Mobile: Card-based list
                  <div className="p-4 space-y-3">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : tasks.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No tasks found</p>
                    ) : (
                      tasks.map(renderTaskCard)
                    )}
                  </div>
                ) : (
                  // Desktop: Table
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Title</th>
                          <th className="text-left p-4 font-medium">Priority</th>
                          <th className="text-left p-4 font-medium">Assigned To</th>
                          <th className="text-left p-4 font-medium">Due Date</th>
                          <th className="text-left p-4 font-medium">Created</th>
                          <th className="p-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            </td>
                          </tr>
                        ) : tasks.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-muted-foreground">
                              No tasks found
                            </td>
                          </tr>
                        ) : (
                          tasks.map((task) => (
                            <tr key={task.id} className="border-b">
                              <td className="p-4">{statusIcons[task.status]}</td>
                              <td className="p-4 font-medium">{task.title}</td>
                              <td className="p-4">
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  <span className={`h-1.5 w-1.5 rounded-full ${priorityColors[task.priority]}`} />
                                  {task.priority}
                                </Badge>
                              </td>
                              <td className="p-4">{task.assignee_name || '-'}</td>
                              <td className="p-4">
                                {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}
                              </td>
                              <td className="p-4">{format(new Date(task.created_at), 'MMM d, yyyy')}</td>
                              <td className="p-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => setDeleteTaskId(task.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {admins.map((admin) => {
                const stats = getAdminStats(admin.id);
                return (
                  <Card key={admin.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {admin.full_name?.charAt(0).toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">{admin.full_name || 'Unknown'}</CardTitle>
                          <CardDescription className="truncate">{admin.email}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{stats.total}</p>
                          <p className="text-xs text-muted-foreground">Total Tasks</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {admins.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No admin team members found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent className="w-[95vw] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTaskId) {
                  deleteTask(deleteTaskId);
                  setDeleteTaskId(null);
                }
              }}
              className="w-full sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function TaskCard({
  task,
  onStatusChange,
  onDelete,
}: {
  task: AdminTask;
  onStatusChange: (taskId: string, status: 'todo' | 'in_progress' | 'done') => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm line-clamp-2">{task.title}</p>
          {task.assignee_name && (
            <p className="text-xs text-muted-foreground mt-1">{task.assignee_name}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive shrink-0"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${priorityColors[task.priority]}`} />
          {task.priority}
        </Badge>
        <Select
          value={task.status}
          onValueChange={(value) => onStatusChange(task.id, value as 'todo' | 'in_progress' | 'done')}
        >
          <SelectTrigger className="h-7 w-auto text-xs px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {task.due_date && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {format(new Date(task.due_date), 'MMM d, yyyy')}
        </div>
      )}
    </Card>
  );
}
