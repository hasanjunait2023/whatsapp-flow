import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FileDown, ExternalLink } from 'lucide-react';
import { Expense, ExpenseCategory } from '@/hooks/useAccounts';
import { AddExpenseDialog } from './AddExpenseDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

interface ExpensesListProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  loading: boolean;
  onAddExpense: (expense: any) => Promise<any>;
  onUpdateExpense: (id: string, expense: any) => Promise<any>;
  onDeleteExpense: (id: string) => Promise<void>;
  currency?: string;
}

const getCategoryBadgeColor = (color: string | null) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colorMap[color || 'gray'] || colorMap.gray;
};

export function ExpensesList({
  expenses,
  categories,
  loading,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  currency = 'BDT'
}: ExpensesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || expense.category_id === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenses(new Set(filteredExpenses.map(e => e.id)));
    } else {
      setSelectedExpenses(new Set());
    }
  };

  const handleSelectExpense = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedExpenses);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedExpenses(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedExpenses.size === 0) return;
    
    try {
      for (const id of selectedExpenses) {
        await onDeleteExpense(id);
      }
      setSelectedExpenses(new Set());
      toast.success(`Deleted ${selectedExpenses.size} expenses`);
    } catch (error) {
      toast.error('Failed to delete expenses');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteExpense(id);
      toast.success('Expense deleted');
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingExpense(null);
  };

  const exportToCsv = () => {
    const headers = ['Date', 'Description', 'Category', 'Vendor', 'Amount', 'Payment Method', 'Reference'];
    const rows = filteredExpenses.map(e => [
      format(new Date(e.expense_date), 'yyyy-MM-dd'),
      e.description,
      e.category?.name || 'Uncategorized',
      e.vendor_name || '',
      e.amount.toString(),
      e.payment_method || '',
      e.reference_number || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Expenses exported to CSV');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Expenses</CardTitle>
              <CardDescription>Manage your business expenses</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToCsv}>
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedExpenses.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedExpenses.size})
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedExpenses.size === filteredExpenses.length && filteredExpenses.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedExpenses.has(expense.id)}
                          onCheckedChange={(checked) => handleSelectExpense(expense.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{expense.description}</span>
                          {expense.reference_number && (
                            <span className="text-xs text-muted-foreground">
                              Ref: {expense.reference_number}
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
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount, expense.currency)}
                      </TableCell>
                      <TableCell className="capitalize">{expense.payment_method?.replace('_', ' ') || '-'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(expense)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {expense.attachment_url && (
                              <DropdownMenuItem asChild>
                                <a href={expense.attachment_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Receipt
                                </a>
                              </DropdownMenuItem>
                            )}
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

      <AddExpenseDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        categories={categories}
        expense={editingExpense}
        onSubmit={async (data) => {
          if (editingExpense) {
            await onUpdateExpense(editingExpense.id, data);
            toast.success('Expense updated');
          } else {
            await onAddExpense(data);
            toast.success('Expense added');
          }
          handleDialogClose();
        }}
      />
    </>
  );
}
