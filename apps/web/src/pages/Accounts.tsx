import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, RefreshCw, TrendingUp, ShoppingBag, Receipt, Clock } from 'lucide-react';
import { useTenantAccounts } from '@/hooks/useTenantAccounts';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { FinanceHeroTile } from '@/components/accounting/FinanceHeroTile';
import { formatCurrency } from '@/lib/currency';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
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

  // Presentational derivations only — sourced from the existing accountsData.
  const totalSales = accountsData?.totalSales ?? 0;
  const totalExpenses = accountsData?.totalExpenses ?? 0;
  const netProfit = accountsData?.netProfit ?? 0;
  const netMargin = accountsData ? Math.round(accountsData.netProfitMargin) : 0;
  const totalOrders = accountsData?.totalOrders ?? 0;
  const unpaidAmount = accountsData?.unpaidOrdersAmount ?? 0;
  const unpaidCount = accountsData?.unpaidOrdersCount ?? 0;

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
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Accounts</h1>
            <p className="text-sm text-muted-foreground">Track sales, expenses, and profitability.</p>
          </div>
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

            <Button variant="outline" size="icon" onClick={refetch} disabled={loading} aria-label="Refresh accounts">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </header>

        {/* KPI strip — soft stat cards + the ONE orange focal tile (net profit) */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <m.div variants={staggerItem}>
            <KpiCard
              title="Total sales"
              value={totalSales}
              format={formatCurrency}
              icon={TrendingUp}
              tone="success"
              trendLabel={`${totalOrders.toLocaleString('en-US')} orders`}
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Total expenses"
              value={totalExpenses}
              format={formatCurrency}
              icon={Receipt}
              tone="destructive"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Outstanding"
              value={unpaidAmount}
              format={formatCurrency}
              icon={Clock}
              tone="warning"
              trendLabel={`${unpaidCount.toLocaleString('en-US')} unpaid`}
              loading={loading}
            />
          </m.div>
          <FinanceHeroTile
            label="Net profit"
            value={netProfit}
            caption={`${netMargin}% net margin in this range`}
            trendLabel={netProfit >= 0 ? 'Profit' : 'Loss'}
            trendUp={netProfit >= 0}
            icon={ShoppingBag}
            loading={loading}
          />
        </m.div>

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
      </m.div>
    </DashboardLayout>
  );
}
