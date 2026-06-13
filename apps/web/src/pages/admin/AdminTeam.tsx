import AdminLayout from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Users, Plus, Loader2, ListTodo, KanbanSquare, Trash2, Calendar, CheckCircle2, Circle, Clock, ListChecks } from 'lucide-react';
import { useAdminTasks, AdminTask } from '@/hooks/useAdminTasks';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDataCard } from '@/components/admin/MobileDataCard';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { m, pageEnter, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';
import { priorityMeta, statusMeta } from '@/components/admin/team/teamTokens';
import { TeamMemberCard } from '@/components/admin/team/TeamMemberCard';

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
  const activeTasks = todoTasks.length + inProgressTasks.length;
  const activeTasksDisplay = useCountUp(activeTasks);

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
          render: (data) => {
            const p = priorityMeta(data.priority);
            return (
              <Badge variant={p.variant} className="flex w-fit items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} aria-hidden />
                {p.label}
              </Badge>
            );
          },
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
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admin Team</h1>
            <p className="text-sm text-muted-foreground">
              Platform staff roster — manage admin members and their task load
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="min-h-[44px] w-full sm:min-h-0 sm:w-auto">
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
        </header>

        {/* KPI summary row — staff + task load. ONE orange focal tile (Active tasks). */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <m.div variants={staggerItem}>
            <KpiCard title="Team members" value={admins.length} icon={Users} tone="info" loading={loading} />
          </m.div>

          {/* The single orange focal tile — work in flight. */}
          <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
            <div className="relative flex h-full min-h-[132px] flex-col justify-between overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-accent">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-primary-foreground/85">Active tasks</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <ListChecks className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <p className="relative z-10 tabular-nums text-2xl font-bold leading-none tracking-tight md:text-3xl">
                {activeTasksDisplay.toLocaleString('en-US')}
              </p>
              <div className="relative z-10 flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {inProgressTasks.length}
                </span>
                <span className="text-xs text-primary-foreground/80">in progress</span>
              </div>
            </div>
          </m.div>

          <m.div variants={staggerItem}>
            <KpiCard title="Completed" value={doneTasks.length} icon={CheckCircle2} tone="success" loading={loading} />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard title="To do" value={todoTasks.length} icon={Circle} tone="warning" loading={loading} />
          </m.div>
        </m.div>

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
                      <Badge variant="neutral-soft" className="ml-auto tabular-nums">{todoTasks.length}</Badge>
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
                      <Clock className="h-4 w-4 text-info" />
                      In Progress
                      <Badge variant="info-soft" className="ml-auto tabular-nums">{inProgressTasks.length}</Badge>
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
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Done
                      <Badge variant="success-soft" className="ml-auto tabular-nums">{doneTasks.length}</Badge>
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
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                          <th className="p-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</th>
                          <th className="p-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority</th>
                          <th className="p-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Assigned To</th>
                          <th className="p-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Due Date</th>
                          <th className="p-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Created</th>
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
                          tasks.map((task) => {
                            const status = statusMeta(task.status);
                            const priority = priorityMeta(task.priority);
                            return (
                            <tr key={task.id} className="border-b transition-colors hover:bg-muted-soft">
                              <td className="p-4">
                                <Badge variant={status.variant} className="gap-1.5">
                                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
                                  {status.label}
                                </Badge>
                              </td>
                              <td className="p-4 font-medium text-foreground">{task.title}</td>
                              <td className="p-4">
                                <Badge variant={priority.variant} className="flex w-fit items-center gap-1.5">
                                  <span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} aria-hidden />
                                  {priority.label}
                                </Badge>
                              </td>
                              <td className="p-4 text-muted-foreground">{task.assignee_name || '-'}</td>
                              <td className="p-4 tabular-nums text-muted-foreground">
                                {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}
                              </td>
                              <td className="p-4 tabular-nums text-muted-foreground">{format(new Date(task.created_at), 'MMM d, yyyy')}</td>
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
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            {admins.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-control bg-accent text-primary">
                    <Users className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="mt-4 text-sm text-muted-foreground">No admin team members found</p>
                </CardContent>
              </Card>
            ) : (
              <m.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {admins.map((admin) => (
                  <m.div key={admin.id} variants={staggerItem}>
                    <TeamMemberCard member={admin} stats={getAdminStats(admin.id)} />
                  </m.div>
                ))}
              </m.div>
            )}
          </TabsContent>
        </Tabs>
      </m.div>

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
  const priority = priorityMeta(task.priority);
  return (
    <Card className="p-3 transition-shadow hover:shadow-elevation-2">
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
        <Badge variant={priority.variant} className="flex items-center gap-1.5 text-xs">
          <span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} aria-hidden />
          {priority.label}
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
