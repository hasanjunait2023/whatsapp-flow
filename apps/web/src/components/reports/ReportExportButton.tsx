import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ReportExportButtonProps {
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  disabled?: boolean;
}

export function ReportExportButton({ onExportPDF, onExportCSV, disabled }: ReportExportButtonProps) {
  const handlePDFExport = () => {
    if (onExportPDF) {
      onExportPDF();
    } else {
      toast.info('PDF export coming soon');
    }
  };

  const handleCSVExport = () => {
    if (onExportCSV) {
      onExportCSV();
    } else {
      toast.info('CSV export coming soon');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePDFExport}>
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCSVExport}>
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
