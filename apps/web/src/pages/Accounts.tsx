import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { useTenantAccounts } from '@/hooks/useTenantAccounts';
import { TenantAccountsDashboard } from '@/components/accounts/TenantAccountsDashboard';
import { TenantExpensesList } from '@/components/accounts/TenantExpensesList';
import { TenantRecurringExpensesList } from '@/components/accounts/TenantRecurringExpensesList';
import { TenantProfitLossStatement } from '@/components/accounts/TenantProfitLossStatement';
import { TenantCashFlowReport } from '@/components/accounts/TenantCashFlowReport';
import { TenantExpenseCategoryManager } from '@/components/accounts/TenantExpenseCategoryManager';
import { SalesDetailReport } from '@/components/accounts/SalesDetailReport';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function Accounts() {
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
    refetch,
  } = useTenantAccounts(startDate, endDate);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            title="Accounts"
            description="Track sales, expenses, and profitability"
          />
          <div className="flex items-center gap-2">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex flex-col sm:flex-row">
                  <div className="p-3 border-b sm:border-b-0 sm:border-r">
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
                <div className="p-3 border-t flex flex-wrap gap-2">
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
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="profit-loss">P&L</TabsTrigger>
              <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="dashboard">
            <div data-tour="accounts-overview">
              <TenantAccountsDashboard
                data={accountsData}
                loading={loading}
              />
            </div>
          </TabsContent>

          <TabsContent value="expenses">
            <TenantExpensesList
              expenses={expenses}
              categories={categories}
              loading={loading}
              onAddExpense={addExpense}
              onUpdateExpense={updateExpense}
              onDeleteExpense={deleteExpense}
            />
          </TabsContent>

          <TabsContent value="recurring">
            <TenantRecurringExpensesList
              recurringExpenses={recurringExpenses}
              categories={categories}
              loading={loading}
              onAdd={addRecurringExpense}
              onUpdate={updateRecurringExpense}
              onDelete={deleteRecurringExpense}
              onGenerate={generateExpenseFromTemplate}
            />
          </TabsContent>

          <TabsContent value="sales">
            <SalesDetailReport
              data={accountsData}
              loading={loading}
              startDate={startDate}
              endDate={endDate}
            />
          </TabsContent>

          <TabsContent value="profit-loss">
            <TenantProfitLossStatement
              data={accountsData}
              loading={loading}
              startDate={startDate}
              endDate={endDate}
            />
          </TabsContent>

          <TabsContent value="cash-flow">
            <TenantCashFlowReport
              data={accountsData}
              loading={loading}
              startDate={startDate}
              endDate={endDate}
            />
          </TabsContent>

          <TabsContent value="categories">
            <TenantExpenseCategoryManager
              categories={categories}
              loading={loading}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
