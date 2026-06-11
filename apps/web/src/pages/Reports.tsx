import { useState } from 'react';
import { startOfMonth, endOfMonth, subDays, differenceInDays, format } from 'date-fns';
import { RefreshCw, GitCompare } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ReportDatePicker } from '@/components/reports/ReportDatePicker';
import { ReportSelector, ReportType } from '@/components/reports/ReportSelector';
import { ReportExportButton } from '@/components/reports/ReportExportButton';
import { OverviewReport } from '@/components/reports/OverviewReport';
import { SalesReport } from '@/components/reports/SalesReport';
import { FinancialReport } from '@/components/reports/FinancialReport';
import { CustomerReport } from '@/components/reports/CustomerReport';
import { ProductReport } from '@/components/reports/ProductReport';
import { OperationsReport } from '@/components/reports/OperationsReport';
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
import { toast } from 'sonner';

export default function Reports() {
  const today = new Date();
  const [startDate, setStartDate] = useState(startOfMonth(today));
  const [endDate, setEndDate] = useState(endOfMonth(today));
  const [selectedReport, setSelectedReport] = useState<ReportType>('overview');
  const [showComparison, setShowComparison] = useState(true);

  const { data, loading, refetch } = useReports(startDate, endDate);
  const { branding } = useCompanyBranding();

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Calculate previous period info for display
  const periodDuration = differenceInDays(endDate, startDate) + 1;
  const prevEndDate = subDays(startDate, 1);
  const prevStartDate = subDays(prevEndDate, periodDuration - 1);

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
      console.error('PDF export error:', error);
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
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          title="Reports"
          description="Comprehensive business analytics and insights"
        />

        <div className="flex flex-col gap-4">
          {/* Top row - Report selector and date picker */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <ReportSelector value={selectedReport} onChange={setSelectedReport} />
              <ReportDatePicker startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <ReportExportButton onExportPDF={handleExportPDF} disabled={loading || !data} />
            </div>
          </div>

          {/* Comparison toggle bar */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              <GitCompare className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Switch
                  id="comparison-mode"
                  checked={showComparison}
                  onCheckedChange={setShowComparison}
                />
                <Label htmlFor="comparison-mode" className="text-sm font-medium cursor-pointer">
                  Show comparison with previous period
                </Label>
              </div>
            </div>
            {showComparison && (
              <Badge variant="secondary" className="text-xs">
                Comparing to {format(prevStartDate, 'MMM d')} - {format(prevEndDate, 'MMM d, yyyy')}
              </Badge>
            )}
          </div>
        </div>

        {renderReport()}
      </div>
    </DashboardLayout>
  );
}
