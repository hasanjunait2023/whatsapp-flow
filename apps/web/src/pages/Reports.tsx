import { useState } from 'react';
import { startOfMonth, endOfMonth, subDays, differenceInDays, format } from 'date-fns';
import { RefreshCw, GitCompare, Wallet, ArrowUpRight, ShoppingBag, Users, AlertTriangle, Percent } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportDatePicker } from '@/components/reports/ReportDatePicker';
import { ReportSelector, ReportType } from '@/components/reports/ReportSelector';
import { ReportExportButton } from '@/components/reports/ReportExportButton';
import { OverviewReport } from '@/components/reports/OverviewReport';
import { SalesReport } from '@/components/reports/SalesReport';
import { FinancialReport } from '@/components/reports/FinancialReport';
import { CustomerReport } from '@/components/reports/CustomerReport';
import { ProductReport } from '@/components/reports/ProductReport';
import { OperationsReport } from '@/components/reports/OperationsReport';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { useReports } from '@/hooks/useReports';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import {
  exportOverviewPDF,
  exportSalesSummaryPDF,
  exportProfitLossPDF,
  exportCashFlowPDF,
  exportTopCustomersPDF,
  exportTopProductsPDF,
} from '@/lib/report-pdf-export';
import { formatCurrency } from '@/lib/currency';
import { m, pageEnter, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';
import { toast } from 'sonner';

/**
 * The single full-orange surface on the Reports page (DESIGN.md §2.2): the focal KPI.
 * Total revenue for the selected period is the page's loudest number; every other stat
 * uses a soft KpiCard. Orange stays rare — this is the only `bg-primary` tile.
 */
function RevenueHighlightTile({ revenue, trend, loading }: { revenue: number; trend: number; loading: boolean }) {
  const display = useCountUp(revenue);

  if (loading) {
    return (
      <div className="flex h-full min-h-[140px] flex-col gap-4 rounded-card bg-primary/80 p-5">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-9 w-32 bg-white/30" />
        <Skeleton className="mt-auto h-4 w-24 bg-white/30" />
      </div>
    );
  }

  const isUp = trend >= 0;
  const rounded = Math.round(trend);

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[140px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <Wallet className="h-4 w-4" aria-hidden />
              Total revenue
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {isUp && <ArrowUpRight className="h-3 w-3" aria-hidden />}
              {`${rounded > 0 ? '+' : ''}${rounded}%`}
            </span>
          </div>

          <p className="mt-2 tabular-nums text-3xl font-bold leading-none tracking-tight md:text-4xl">
            {formatCurrency(display)}
          </p>

          <span className="mt-auto pt-3 text-xs text-primary-foreground/80">for the selected period</span>
        </div>
      </div>
    </m.div>
  );
}

export default function Reports() {
  const today = new Date();
  const [startDate, setStartDate] = useState(startOfMonth(today));
  const [endDate, setEndDate] = useState(endOfMonth(today));
  const [selectedReport, setSelectedReport] = useState<ReportType>('overview');
  const [showComparison, setShowComparison] = useState(true);

  const { data, loading, refetch, error } = useReports(startDate, endDate);
  const { branding } = useCompanyBranding();

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Calculate previous period info for display
  const periodDuration = differenceInDays(endDate, startDate) + 1;
  const prevEndDate = subDays(startDate, 1);
  const prevStartDate = subDays(prevEndDate, periodDuration - 1);

  const summary = data?.summary;

  const handleExportPDF = () => {
    if (!data) {
      toast.error('No data to export');
      return;
    }

    try {
      switch (selectedReport) {
        case 'overview':
          exportOverviewPDF(data, startDate, endDate, branding);
          break;
        case 'sales':
          exportSalesSummaryPDF(data, startDate, endDate, branding);
          break;
        case 'financial':
          exportProfitLossPDF(data, startDate, endDate, branding);
          break;
        case 'customers':
          exportTopCustomersPDF(data, startDate, endDate, branding);
          break;
        case 'products':
          exportTopProductsPDF(data, startDate, endDate, branding);
          break;
        case 'operations':
          exportOverviewPDF(data, startDate, endDate, branding);
          break;
        default:
          exportOverviewPDF(data, startDate, endDate, branding);
      }
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const renderReport = () => {
    switch (selectedReport) {
      case 'overview':
        return <OverviewReport data={data} loading={loading} showComparison={showComparison} />;
      case 'sales':
        return <SalesReport data={data} loading={loading} showComparison={showComparison} />;
      case 'financial':
        return <FinancialReport data={data} loading={loading} showComparison={showComparison} />;
      case 'customers':
        return <CustomerReport data={data} loading={loading} showComparison={showComparison} />;
      case 'products':
        return <ProductReport data={data} loading={loading} />;
      case 'operations':
        return <OperationsReport data={data} loading={loading} />;
      default:
        return <OverviewReport data={data} loading={loading} showComparison={showComparison} />;
    }
  };

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5 space-y-6"
      >
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load report data. Please try refreshing.
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground">Comprehensive business analytics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={loading}
              aria-label="Refresh reports"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <ReportExportButton onExportPDF={handleExportPDF} disabled={loading || !data} />
          </div>
        </header>

        {/* KPI strip — soft stat cards + the ONE orange highlight (total revenue) */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-5"
        >
          <div className="col-span-2 lg:col-span-1">
            <RevenueHighlightTile
              revenue={summary?.totalRevenue ?? 0}
              trend={summary?.revenueChange ?? 0}
              loading={loading}
            />
          </div>
          <KpiCard
            title="Orders"
            value={summary?.totalOrders ?? 0}
            icon={ShoppingBag}
            tone="info"
            trendPct={summary ? Math.round(summary.ordersChange) : undefined}
            trendLabel={summary ? 'vs prev period' : undefined}
            loading={loading}
          />
          <KpiCard
            title="New customers"
            value={summary?.newCustomers ?? 0}
            icon={Users}
            tone="success"
            trendPct={summary ? Math.round(summary.customersChange) : undefined}
            trendLabel={summary ? 'vs prev period' : undefined}
            loading={loading}
          />
          <KpiCard
            title="Collection rate"
            value={summary?.collectionRate ?? 0}
            format={(v) => `${Math.round(v)}%`}
            icon={Percent}
            tone="primary"
            loading={loading}
          />
          <KpiCard
            title="Open complaints"
            value={summary?.openComplaints ?? 0}
            icon={AlertTriangle}
            tone="warning"
            loading={loading}
          />
        </m.div>

        {/* Report controls — selector, date range, comparison toggle */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <ReportSelector value={selectedReport} onChange={setSelectedReport} />
                <ReportDatePicker startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />
              </div>
            </div>

            {/* Comparison toggle bar */}
            <div className="flex flex-col items-start justify-between gap-3 rounded-control bg-muted/50 p-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <GitCompare className="h-4 w-4 text-muted-foreground" aria-hidden />
                <div className="flex items-center gap-2">
                  <Switch id="comparison-mode" checked={showComparison} onCheckedChange={setShowComparison} />
                  <Label htmlFor="comparison-mode" className="cursor-pointer text-sm font-medium">
                    Show comparison with previous period
                  </Label>
                </div>
              </div>
              {showComparison && (
                <Badge variant="neutral-soft" className="text-xs tabular-nums">
                  Comparing to {format(prevStartDate, 'MMM d')} - {format(prevEndDate, 'MMM d, yyyy')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {renderReport()}
      </m.div>
    </DashboardLayout>
  );
}
