import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Accounts"
            description="Financial overview, expenses, and reports"
          />
          <div className="flex items-center gap-2">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
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

            <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
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
      </div>
    </AdminLayout>
  );
}
