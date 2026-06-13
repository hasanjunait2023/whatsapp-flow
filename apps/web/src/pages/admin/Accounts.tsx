import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import AdminLayout from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, RefreshCw, DollarSign, Receipt, Clock } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { NetIncomeHighlightTile } from '@/components/admin/accounts/NetIncomeHighlightTile';
import { formatCurrency } from '@/lib/currency';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import { AccountsDashboard } from '@/components/admin/accounts/AccountsDashboard';
import { ExpensesList } from '@/components/admin/accounts/ExpensesList';
import { IncomeStatement } from '@/components/admin/accounts/IncomeStatement';
import { CashFlowReport } from '@/components/admin/accounts/CashFlowReport';
import { PaymentMethodAnalysis } from '@/components/admin/accounts/PaymentMethodAnalysis';
import { ExpenseCategoryManager } from '@/components/admin/accounts/ExpenseCategoryManager';
import { RecurringExpensesList } from '@/components/admin/accounts/RecurringExpensesList';

export default function AdminAccounts() {
  const [startDate, setStartDate] = useState<Date>(subMonths(startOfMonth(new Date()), 11));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const {
    loading,
    expenses,
    categories,
    recurringExpenses,
    accountsData,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    updateCategory,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    generateExpenseFromTemplate,
    refetch
  } = useAccounts(startDate, endDate);

  return (
    <AdminLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Accounts</h1>
            <p className="text-sm text-muted-foreground">
              Financial overview, expenses &amp; reports across the platform
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] justify-start text-left font-normal sm:min-h-0 sm:w-[240px]"
                >
                  <CalendarIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline tabular-nums">
                    {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex">
                  <div className="p-3 border-r">
                    <p className="text-sm font-medium mb-2">Start Date</p>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium mb-2">End Date</p>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                    />
                  </div>
                </div>
                <div className="p-3 border-t flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate(startOfMonth(new Date()));
                      setEndDate(endOfMonth(new Date()));
                    }}
                  >
                    This Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate(subMonths(startOfMonth(new Date()), 2));
                      setEndDate(endOfMonth(new Date()));
                    }}
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate(subMonths(startOfMonth(new Date()), 11));
                      setEndDate(endOfMonth(new Date()));
                    }}
                  >
                    Last 12 Months
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="min-h-[44px] sm:min-h-0"
            >
              <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </header>

        {/* KPI strip — 3 stat cards + the ONE orange net-income tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <KpiCard
            title="Total revenue"
            value={accountsData?.totalRevenue ?? 0}
            format={formatCurrency}
            icon={DollarSign}
            tone="success"
            loading={loading || !accountsData}
          />
          <KpiCard
            title="Total expenses"
            value={accountsData?.totalExpenses ?? 0}
            format={formatCurrency}
            icon={Receipt}
            tone="destructive"
            loading={loading || !accountsData}
          />
          <KpiCard
            title="Pending"
            value={accountsData?.pendingPayments ?? 0}
            format={formatCurrency}
            icon={Clock}
            tone="warning"
            loading={loading || !accountsData}
          />
          <m.div variants={staggerItem}>
            <NetIncomeHighlightTile
              netIncome={accountsData?.netIncome ?? 0}
              profitMargin={accountsData?.profitMargin ?? 0}
              loading={loading || !accountsData}
            />
          </m.div>
        </m.div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
            <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
            <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AccountsDashboard
              data={accountsData}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesList
              expenses={expenses}
              categories={categories}
              loading={loading}
              onAddExpense={addExpense}
              onUpdateExpense={updateExpense}
              onDeleteExpense={deleteExpense}
            />
          </TabsContent>

          <TabsContent value="recurring">
            <RecurringExpensesList
              recurringExpenses={recurringExpenses}
              categories={categories}
              loading={loading}
              onAdd={addRecurringExpense}
              onUpdate={updateRecurringExpense}
              onDelete={deleteRecurringExpense}
              onGenerate={generateExpenseFromTemplate}
            />
          </TabsContent>

          <TabsContent value="income-statement">
            <IncomeStatement
              data={accountsData}
              loading={loading}
              startDate={startDate}
              endDate={endDate}
            />
          </TabsContent>

          <TabsContent value="cash-flow">
            <CashFlowReport
              data={accountsData}
              loading={loading}
              startDate={startDate}
              endDate={endDate}
            />
          </TabsContent>

          <TabsContent value="payment-methods">
            <PaymentMethodAnalysis
              data={accountsData}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="categories">
            <ExpenseCategoryManager
              categories={categories}
              loading={loading}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
            />
          </TabsContent>
        </Tabs>
      </m.div>
    </AdminLayout>
  );
}
