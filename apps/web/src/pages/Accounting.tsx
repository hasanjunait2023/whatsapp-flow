import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccounting, type Expense } from '@/hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, Wallet, Plus, Trash2, Loader2, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TAKA = '৳'; // ৳

function money(n: number): string {
  return `${TAKA}${(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export default function Accounting() {
  const { categories, expenses, summary, loading, createExpense, deleteExpense, createCategory } = useAccounting();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [form, setForm] = useState({
    amount: '',
    description: '',
    expense_date: new Date().toISOString().slice(0, 10),
    category_id: '',
    payment_method: '',
    vendor_name: '',
  });

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name || '—';

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0 || !form.description.trim()) {
      toast({ title: 'Amount and description are required', variant: 'destructive' });
      return;
    }
    try {
      await createExpense.mutateAsync({
        amount,
        description: form.description.trim(),
        expense_date: form.expense_date,
        category_id: form.category_id || null,
        payment_method: form.payment_method || null,
        vendor_name: form.vendor_name || null,
      });
      toast({ title: 'Expense recorded' });
      setOpen(false);
      setForm({ amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10), category_id: '', payment_method: '', vendor_name: '' });
    } catch (e) {
      toast({ title: 'Failed to record expense', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await createCategory.mutateAsync({ name: newCategory.trim() });
      setNewCategory('');
      toast({ title: 'Category added' });
    } catch (e) {
      toast({ title: 'Failed to add category', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Receipt className="h-6 w-6" /> Accounting
            </h1>
            <p className="text-sm text-muted-foreground">Track expenses and this month&apos;s profit/loss.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record an expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Amount (BDT)</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Facebook ads" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Uncategorised" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Payment method</Label>
                    <Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="bKash / cash" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Vendor (optional)</Label>
                  <Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} />
                </div>
                <div className="flex items-end gap-2 pt-2 border-t">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Quick-add category</Label>
                    <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
                  </div>
                  <Button type="button" variant="outline" onClick={handleAddCategory} disabled={createCategory.isPending}>Add</Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSubmit} disabled={createExpense.isPending}>
                  {createExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save expense
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /> Income (this month)</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{money(summary?.income || 0)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Expenses (this month)</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{money(summary?.expenses || 0)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" /> Net profit</CardTitle></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${(summary?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(summary?.net || 0)}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Expenses</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet. Add your first one.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e: Expense) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">{e.expense_date}</TableCell>
                      <TableCell>{e.description}{e.vendor_name ? <span className="text-muted-foreground"> · {e.vendor_name}</span> : null}</TableCell>
                      <TableCell>{categoryName(e.category_id)}</TableCell>
                      <TableCell className="text-right font-medium">{money(e.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => deleteExpense.mutate(e.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
