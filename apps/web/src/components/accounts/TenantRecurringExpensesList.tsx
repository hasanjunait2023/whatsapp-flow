import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Play, CalendarClock } from 'lucide-react';
import { TenantRecurringExpense, TenantExpenseCategory } from '@/hooks/useTenantAccounts';
import { AddTenantRecurringExpenseDialog } from './AddTenantRecurringExpenseDialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
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

interface TenantRecurringExpensesListProps {
  recurringExpenses: TenantRecurringExpense[];
  categories: TenantExpenseCategory[];
  loading: boolean;
  onAdd: (expense: any) => Promise<any>;
  onUpdate: (expense: any) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onGenerate: (template: TenantRecurringExpense) => Promise<any>;
  currency?: string;
}

const getCategoryBadgeColor = (color: string | null) => {
  const colorMap: Record<string, string> = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return colorMap[color || 'gray'] || colorMap.gray;
};

const getFrequencyLabel = (frequency: string) => {
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };
  return labels[frequency] || frequency;
};

export function TenantRecurringExpensesList({
  recurringExpenses,
  categories,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onGenerate,
  currency = 'BDT',
}: TenantRecurringExpensesListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TenantRecurringExpense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<TenantRecurringExpense | null>(null);

  const activeExpenses = recurringExpenses.filter((e) => e.is_active);
  const estimatedMonthly = activeExpenses.reduce((sum, e) => {
    let monthlyAmount = e.amount;
    if (e.frequency === 'daily') monthlyAmount = e.amount * 30;
    else if (e.frequency === 'weekly') monthlyAmount = e.amount * 4;
    else if (e.frequency === 'yearly') monthlyAmount = e.amount / 12;
    return sum + monthlyAmount;
  }, 0);

  const handleEdit = (expense: TenantRecurringExpense) => {
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  const handleDelete = (expense: TenantRecurringExpense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (expenseToDelete) {
      await onDelete(expenseToDelete.id);
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleToggleActive = async (expense: TenantRecurringExpense) => {
    await onUpdate({ id: expense.id, is_active: !expense.is_active });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recurring Expenses</CardTitle>
              <CardDescription>Manage your recurring expense templates</CardDescription>
            </div>
            <Button onClick={() => { setEditingExpense(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <CalendarClock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Estimated Monthly Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(estimatedMonthly, currency)}</p>
                <p className="text-xs text-muted-foreground">{activeExpenses.length} active templates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        <Card>
          <CardContent className="p-0">
            {recurringExpenses.length === 0 ? (
              <div className="text-center py-12">
                <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No recurring expenses configured</p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first template
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="md:hidden divide-y">
                  {recurringExpenses.map((expense) => (
                    <div key={expense.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={expense.is_active}
                            onCheckedChange={() => handleToggleActive(expense)}
                          />
                          <div>
                            <p className={cn('font-medium', !expense.is_active && 'text-muted-foreground')}>
                              {expense.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getFrequencyLabel(expense.frequency)}
                              </Badge>
                              {expense.category && (
                                <Badge className={cn('text-xs', getCategoryBadgeColor(expense.category.color))}>
                                  {expense.category.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="font-semibold">{formatCurrency(expense.amount, expense.currency)}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Next due: {expense.next_due_date ? format(new Date(expense.next_due_date), 'MMM d, yyyy') : 'Not set'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onGenerate(expense)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Generate
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(expense)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(expense)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Active</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Next Due</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recurringExpenses.map((expense) => (
                        <TableRow key={expense.id} className={cn(!expense.is_active && 'opacity-50')}>
                          <TableCell>
                            <Switch
                              checked={expense.is_active}
                              onCheckedChange={() => handleToggleActive(expense)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>
                            {expense.category ? (
                              <Badge className={cn('text-xs', getCategoryBadgeColor(expense.category.color))}>
                                {expense.category.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getFrequencyLabel(expense.frequency)}</Badge>
                          </TableCell>
                          <TableCell>
                            {expense.next_due_date
                              ? format(new Date(expense.next_due_date), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(expense.amount, expense.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onGenerate(expense)}
                                title="Generate expense now"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(expense)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDelete(expense)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AddTenantRecurringExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        expense={editingExpense}
        onSubmit={async (data) => {
          if (editingExpense) {
            await onUpdate({ id: editingExpense.id, ...data });
          } else {
            await onAdd(data);
          }
          setDialogOpen(false);
          setEditingExpense(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring expense template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
