import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Download, FileText } from 'lucide-react';
import { TenantExpense, TenantExpenseCategory } from '@/hooks/useTenantAccounts';
import { AddTenantExpenseDialog } from './AddTenantExpenseDialog';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/lib/csv-export';
import { toast } from 'sonner';
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

interface TenantExpensesListProps {
  expenses: TenantExpense[];
  categories: TenantExpenseCategory[];
  loading: boolean;
  onAddExpense: (expense: any) => Promise<any>;
  onUpdateExpense: (expense: any) => Promise<any>;
  onDeleteExpense: (id: string) => Promise<void>;
  currency?: string;
}

const getCategoryBadgeColor = (color: string | null) => {
  const colorMap: Record<string, string> = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return colorMap[color || 'gray'] || colorMap.gray;
};

export function TenantExpensesList({
  expenses,
  categories,
  loading,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  currency = 'BDT',
}: TenantExpensesListProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TenantExpense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<TenantExpense | null>(null);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(search.toLowerCase()) ||
      expense.vendor_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (expense: TenantExpense) => {
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  const handleDelete = (expense: TenantExpense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (expenseToDelete) {
      await onDeleteExpense(expenseToDelete.id);
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleExportCSV = () => {
    const data = filteredExpenses.map((expense) => ({
      date: format(new Date(expense.expense_date), 'yyyy-MM-dd'),
      description: expense.description,
      category: expense.category?.name || 'Uncategorized',
      amount: expense.amount,
      currency: expense.currency,
      vendor: expense.vendor_name || '',
      paymentMethod: expense.payment_method || '',
      reference: expense.reference_number || '',
      notes: expense.notes || '',
    }));
    const columns = [
      { key: 'date' as const, header: 'Date' },
      { key: 'description' as const, header: 'Description' },
      { key: 'category' as const, header: 'Category' },
      { key: 'amount' as const, header: 'Amount' },
      { key: 'currency' as const, header: 'Currency' },
      { key: 'vendor' as const, header: 'Vendor' },
      { key: 'paymentMethod' as const, header: 'Payment Method' },
      { key: 'reference' as const, header: 'Reference' },
      { key: 'notes' as const, header: 'Notes' },
    ];
    exportToCSV(data, columns, `expenses-${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Expenses exported to CSV');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Expenses</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
              </Button>
              <Button onClick={() => { setEditingExpense(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No expenses found</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first expense
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <p className="font-semibold text-destructive">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={cn('text-xs', getCategoryBadgeColor(expense.category?.color || null))}>
                        {expense.category?.name || 'Uncategorized'}
                      </Badge>
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
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', getCategoryBadgeColor(expense.category?.color || null))}>
                            {expense.category?.name || 'Uncategorized'}
                          </Badge>
                        </TableCell>
                        <TableCell>{expense.vendor_name || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {formatCurrency(expense.amount, expense.currency)}
                        </TableCell>
                        <TableCell>
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

      <AddTenantExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        expense={editingExpense}
        onSubmit={async (data) => {
          if (editingExpense) {
            await onUpdateExpense({ id: editingExpense.id, ...data });
          } else {
            await onAddExpense(data);
          }
          setDialogOpen(false);
          setEditingExpense(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
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
