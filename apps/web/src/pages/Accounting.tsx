import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccounting, type Expense } from '@/hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, Plus, Trash2, Loader2, Receipt, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { FinanceHeroTile } from '@/components/accounting/FinanceHeroTile';
import { formatCurrency } from '@/lib/currency';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';

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

  const income = summary?.income ?? 0;
  const expensesTotal = summary?.expenses ?? 0;
  const net = summary?.net ?? 0;

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8"
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              <Receipt className="h-6 w-6 text-primary" aria-hidden /> Accounting
            </h1>
            <p className="text-sm text-muted-foreground">Track expenses and this month&apos;s profit and loss.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary"><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
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
        </header>

        {/* KPI strip — soft stat cards + the ONE orange focal tile (net profit) */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3"
        >
          <m.div variants={staggerItem}>
            <KpiCard
              title="Income (this month)"
              value={income}
              format={formatCurrency}
              icon={TrendingUp}
              tone="success"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Expenses (this month)"
              value={expensesTotal}
              format={formatCurrency}
              icon={TrendingDown}
              tone="destructive"
              loading={loading}
            />
          </m.div>
          <FinanceHeroTile
            label="Net profit"
            value={net}
            caption="This month, income minus expenses"
            trendLabel={net >= 0 ? 'Profit' : 'Loss'}
            trendUp={net >= 0}
            loading={loading}
          />
        </m.div>

        <Card>
          <CardHeader><CardTitle className="text-base">Expenses</CardTitle></CardHeader>
          <CardContent className="p-0 sm:p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : expenses.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No expenses yet"
                description="Record your first expense to start tracking spend and profitability."
                action={{ label: 'Add Expense', onClick: () => setOpen(true), icon: Plus }}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e: Expense) => (
                    <TableRow key={e.id} className="hover:bg-muted-soft">
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{e.expense_date}</TableCell>
                      <TableCell className="font-medium">{e.description}{e.vendor_name ? <span className="font-normal text-muted-foreground"> · {e.vendor_name}</span> : null}</TableCell>
                      <TableCell>{categoryName(e.category_id)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{money(e.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Delete expense" onClick={() => deleteExpense.mutate(e.id)}>
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
      </m.div>
    </DashboardLayout>
  );
}
