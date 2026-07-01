import { useState } from 'react';
import { format, addMonths, addWeeks, addYears } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Play, RefreshCw } from 'lucide-react';
import { RecurringExpense, ExpenseCategory } from '@/hooks/useAccounts';
import { AddRecurringExpenseDialog } from './AddRecurringExpenseDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

interface RecurringExpensesListProps {
  recurringExpenses: RecurringExpense[];
  categories: ExpenseCategory[];
  loading: boolean;
  onAdd: (data: any) => Promise<any>;
  onUpdate: (id: string, data: any) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onGenerate: (id: string) => Promise<any>;
  currency?: string;
}

const getCategoryBadgeColor = (color: string | null) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    orange: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colorMap[color || 'gray'] || colorMap.gray;
};

const getFrequencyLabel = (frequency: string) => {
  switch (frequency) {
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'yearly': return 'Yearly';
    default: return frequency;
  }
};

export function RecurringExpensesList({
  recurringExpenses,
  categories,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onGenerate,
  currency = 'BDT'
}: RecurringExpensesListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleEdit = (expense: RecurringExpense) => {
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      toast.success('Recurring expense deleted');
    } catch (error) {
      toast.error('Failed to delete recurring expense');
    }
  };

  const handleToggleActive = async (expense: RecurringExpense) => {
    try {
      await onUpdate(expense.id, { is_active: !expense.is_active });
      toast.success(expense.is_active ? 'Template paused' : 'Template activated');
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  const handleGenerate = async (id: string) => {
    try {
      setGeneratingId(id);
      await onGenerate(id);
      toast.success('Expense generated from template');
    } catch (error) {
      toast.error('Failed to generate expense');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingExpense(null);
  };

  // Calculate monthly total from active recurring expenses
  const monthlyTotal = recurringExpenses
    .filter(e => e.is_active)
    .reduce((sum, e) => {
      switch (e.frequency) {
        case 'weekly': return sum + (e.amount * 4.33);
        case 'yearly': return sum + (e.amount / 12);
        default: return sum + e.amount;
      }
    }, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Summary Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Monthly Cost</p>
                <p className="text-3xl font-bold">{formatCurrency(monthlyTotal, currency)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  From {recurringExpenses.filter(e => e.is_active).length} active templates
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recurring Expense Templates</CardTitle>
            <CardDescription>Automate regular business expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Active</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No recurring expense templates yet. Create one to automate regular costs.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recurringExpenses.map((expense) => (
                      <TableRow key={expense.id} className={!expense.is_active ? 'opacity-50' : ''}>
                        <TableCell>
                          <Switch
                            checked={expense.is_active}
                            onCheckedChange={() => handleToggleActive(expense)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{expense.description}</span>
                            {expense.notes && (
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {expense.notes}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getCategoryBadgeColor(expense.category?.color)}>
                            {expense.category?.name || 'Uncategorized'}
                          </Badge>
                        </TableCell>
                        <TableCell>{expense.vendor_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getFrequencyLabel(expense.frequency)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(expense.amount, expense.currency)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {expense.next_due_date ? format(new Date(expense.next_due_date), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleGenerate(expense.id)}>
                                {generatingId === expense.id ? (
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4 mr-2" />
                                )}
                                Generate Now
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(expense)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(expense.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddRecurringExpenseDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        categories={categories}
        expense={editingExpense}
        onSubmit={async (data) => {
          if (editingExpense) {
            await onUpdate(editingExpense.id, data);
            toast.success('Template updated');
          } else {
            await onAdd(data);
            toast.success('Template created');
          }
          handleDialogClose();
        }}
      />
    </>
  );
}
