import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AccountsData } from '@/hooks/useAccounts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { exportIncomeStatementPDF } from '@/lib/pdf-export';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

interface IncomeStatementProps {
  data: AccountsData | null;
  loading: boolean;
  startDate: Date;
  endDate: Date;
}

export function IncomeStatement({ data, loading, startDate, endDate }: IncomeStatementProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const handleExportPDF = () => {
    try {
      exportIncomeStatementPDF(data, startDate, endDate, 'BDT');
      toast.success('Income Statement exported to PDF');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center border-b">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <div className="text-center flex-1">
            <CardTitle className="text-2xl">Income Statement</CardTitle>
            <CardDescription className="text-base">
              Period: {format(startDate, 'MMMM d, yyyy')} - {format(endDate, 'MMMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex-1 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Revenue Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">REVENUE</h3>
          
          <div className="flex justify-between items-center pl-4">
            <span className="text-muted-foreground">Subscription Payments</span>
            <span className="font-medium">{formatCurrency(data.totalRevenue)}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center font-semibold">
            <span>Total Revenue</span>
            <span className="text-green-600 dark:text-green-400">{formatCurrency(data.totalRevenue)}</span>
          </div>
        </div>

        <div className="my-6" />

        {/* Expenses Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">EXPENSES</h3>
          
          {data.expensesByCategory.length === 0 ? (
            <div className="pl-4 text-muted-foreground italic">No expenses recorded</div>
          ) : (
            data.expensesByCategory.map((category) => (
              <div key={category.categoryId} className="flex justify-between items-center pl-4">
                <span className="text-muted-foreground">{category.category}</span>
                <span className="font-medium">{formatCurrency(category.amount)}</span>
              </div>
            ))
          )}
          
          <Separator />
          
          <div className="flex justify-between items-center font-semibold">
            <span>Total Expenses</span>
            <span className="text-red-600 dark:text-red-400">{formatCurrency(data.totalExpenses)}</span>
          </div>
        </div>

        <div className="my-8" />

        {/* Net Income Section */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center text-xl font-bold">
            <span>NET INCOME</span>
            <span className={data.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {formatCurrency(data.netIncome)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Profit Margin</span>
            <span className={data.profitMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {data.profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(data.totalRevenue)}
            </div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(data.totalExpenses)}
            </div>
            <div className="text-sm text-muted-foreground">Total Expenses</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {data.netIncome >= 0 ? 'Profit' : 'Loss'}
            </div>
            <div className="text-sm text-muted-foreground">{data.profitMargin.toFixed(1)}% Margin</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
