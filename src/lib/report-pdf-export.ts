import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ReportsData } from '@/hooks/useReports';

export interface CompanyBranding {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  logoUrl?: string;
}

const formatCurrency = (amount: number, currency = 'BDT') => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatChange = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

function addHeader(
  doc: jsPDF,
  title: string,
  startDate: Date,
  endDate: Date,
  branding: CompanyBranding
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 15;

  // Company Name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(branding.companyName || 'Business Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Company Contact Info
  if (branding.companyAddress || branding.companyPhone || branding.companyEmail) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const contactParts = [
      branding.companyAddress,
      branding.companyPhone,
      branding.companyEmail
    ].filter(Boolean);
    doc.text(contactParts.join(' | '), pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
  }

  // Report Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(title, pageWidth / 2, yPosition + 5, { align: 'center' });
  yPosition += 12;

  // Date Range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(
    `Period: ${format(startDate, 'MMMM d, yyyy')} - ${format(endDate, 'MMMM d, yyyy')}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 6;

  // Generated date
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, yPosition, { align: 'center' });

  // Horizontal line
  yPosition += 5;
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(14, yPosition, pageWidth - 14, yPosition);

  return yPosition + 10;
}

function addFooter(doc: jsPDF, pageNum: number, branding: CompanyBranding) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text(branding.companyName || '', 14, pageHeight - 10);
  doc.text('Confidential', pageWidth - 14, pageHeight - 10, { align: 'right' });
}

export function exportSalesSummaryPDF(
  data: ReportsData,
  startDate: Date,
  endDate: Date,
  branding: CompanyBranding,
  currency = 'BDT'
): void {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'Sales Summary Report', startDate, endDate, branding);

  // KPI Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Performance Indicators', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Current Period', 'Change vs Previous']],
    body: [
      ['Total Revenue', formatCurrency(data.summary.totalRevenue, currency), formatChange(data.summary.revenueChange)],
      ['Total Orders', data.summary.totalOrders.toString(), formatChange(data.summary.ordersChange)],
      ['Average Order Value', formatCurrency(data.summary.averageOrderValue, currency), formatChange(data.summary.aovChange)],
      ['Collection Rate', `${data.summary.collectionRate.toFixed(1)}%`, '-'],
      ['Gross Profit Margin', `${data.summary.grossProfitMargin.toFixed(1)}%`, '-'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60, halign: 'right' },
      2: { cellWidth: 50, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Orders by Status
  if (data.ordersByStatus.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Orders by Status', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Status', 'Count', 'Value']],
      body: data.ordersByStatus.map(item => [
        item.status.charAt(0).toUpperCase() + item.status.slice(1),
        item.count.toString(),
        formatCurrency(item.value, currency)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128] },
      margin: { left: 14, right: 14 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Revenue by Source
  if (data.revenueBySource.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Revenue by Source', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Source', 'Orders', 'Revenue']],
      body: data.revenueBySource.map(item => [
        item.source.charAt(0).toUpperCase() + item.source.slice(1),
        item.count.toString(),
        formatCurrency(item.value, currency)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128] },
      margin: { left: 14, right: 14 }
    });
  }

  addFooter(doc, 1, branding);
  doc.save(`sales-summary-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`);
}

export function exportProfitLossPDF(
  data: ReportsData,
  startDate: Date,
  endDate: Date,
  branding: CompanyBranding,
  currency = 'BDT'
): void {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'Profit & Loss Statement', startDate, endDate, branding);

  const pl = data.profitLoss;

  // P&L Table
  autoTable(doc, {
    startY: yPosition,
    body: [
      [{ content: 'REVENUE', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } }, { content: formatCurrency(pl.revenue, currency), styles: { fontStyle: 'bold', fillColor: [240, 253, 244], halign: 'right' } }],
      ['Less: Cost of Goods Sold', { content: `-${formatCurrency(pl.cogs, currency)}`, styles: { textColor: [220, 38, 38], halign: 'right' } }],
      [{ content: 'Gross Profit', styles: { fontStyle: 'bold', fillColor: [239, 246, 255] } }, { content: formatCurrency(pl.grossProfit, currency), styles: { fontStyle: 'bold', fillColor: [239, 246, 255], halign: 'right' } }],
      ['Gross Margin', { content: `${((pl.grossProfit / (pl.revenue || 1)) * 100).toFixed(1)}%`, styles: { halign: 'right' } }],
      ['Less: Operating Expenses', { content: `-${formatCurrency(pl.operatingExpenses, currency)}`, styles: { textColor: [220, 38, 38], halign: 'right' } }],
      [{ content: 'NET PROFIT', styles: { fontStyle: 'bold', fillColor: pl.netProfit >= 0 ? [240, 253, 244] : [254, 242, 242] } }, { content: formatCurrency(pl.netProfit, currency), styles: { fontStyle: 'bold', fillColor: pl.netProfit >= 0 ? [240, 253, 244] : [254, 242, 242], textColor: pl.netProfit >= 0 ? [22, 163, 74] : [220, 38, 38], halign: 'right' } }],
      ['Net Profit Margin', { content: `${pl.profitMargin.toFixed(1)}%`, styles: { halign: 'right' } }],
    ],
    theme: 'plain',
    styles: { fontSize: 11 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 60 }
    },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 20;

  // Expense Breakdown
  if (data.expensesByCategory.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Expense Breakdown', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Amount', '% of Total']],
      body: data.expensesByCategory.map(item => [
        item.category,
        formatCurrency(item.amount, currency),
        `${item.percentage.toFixed(1)}%`
      ]),
      foot: [['Total Expenses', formatCurrency(data.expensesByCategory.reduce((sum, e) => sum + e.amount, 0), currency), '100%']],
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      footStyles: { fillColor: [254, 226, 226], fontStyle: 'bold' },
      margin: { left: 14, right: 14 }
    });
  }

  addFooter(doc, 1, branding);
  doc.save(`profit-loss-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`);
}

export function exportCashFlowPDF(
  data: ReportsData,
  startDate: Date,
  endDate: Date,
  branding: CompanyBranding,
  currency = 'BDT'
): void {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'Cash Flow Report', startDate, endDate, branding);

  const totalInflow = data.monthlyCashFlow.reduce((sum, m) => sum + m.inflow, 0);
  const totalOutflow = data.monthlyCashFlow.reduce((sum, m) => sum + m.outflow, 0);
  const netCashFlow = totalInflow - totalOutflow;

  // Summary
  autoTable(doc, {
    startY: yPosition,
    body: [
      ['Total Cash Inflow', { content: formatCurrency(totalInflow, currency), styles: { textColor: [22, 163, 74], fontStyle: 'bold', halign: 'right' } }],
      ['Total Cash Outflow', { content: formatCurrency(totalOutflow, currency), styles: { textColor: [220, 38, 38], fontStyle: 'bold', halign: 'right' } }],
      [{ content: 'Net Cash Flow', styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } }, { content: formatCurrency(netCashFlow, currency), styles: { fontStyle: 'bold', textColor: netCashFlow >= 0 ? [22, 163, 74] : [220, 38, 38], fillColor: [249, 250, 251], halign: 'right' } }],
    ],
    theme: 'plain',
    styles: { fontSize: 12 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 80 }
    },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Monthly Breakdown
  if (data.monthlyCashFlow.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Breakdown', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Month', 'Cash In', 'Cash Out', 'Net Flow', 'Running Balance']],
      body: data.monthlyCashFlow.map(item => [
        format(new Date(`${item.month}-01`), 'MMM yyyy'),
        formatCurrency(item.inflow, currency),
        formatCurrency(item.outflow, currency),
        `${item.netFlow >= 0 ? '+' : ''}${formatCurrency(item.netFlow, currency)}`,
        formatCurrency(item.runningBalance, currency)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      didParseCell: (cellData) => {
        if (cellData.column.index === 1 && cellData.section === 'body') {
          cellData.cell.styles.textColor = [22, 163, 74];
        }
        if (cellData.column.index === 2 && cellData.section === 'body') {
          cellData.cell.styles.textColor = [220, 38, 38];
        }
      },
      margin: { left: 14, right: 14 }
    });
  }

  addFooter(doc, 1, branding);
  doc.save(`cash-flow-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`);
}

export function exportTopCustomersPDF(
  data: ReportsData,
  startDate: Date,
  endDate: Date,
  branding: CompanyBranding,
  currency = 'BDT'
): void {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'Top Customers Report', startDate, endDate, branding);

  // Customer KPIs
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Overview', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    body: [
      ['New Customers (This Period)', data.summary.newCustomers.toString()],
      ['Growth vs Previous Period', formatChange(data.summary.customersChange)],
    ],
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 80, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Top Customers Table
  if (data.topCustomers.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Top 10 Customers by Revenue', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Customer Name', 'Phone', 'Orders', 'Total Spent']],
      body: data.topCustomers.map((customer, index) => [
        (index + 1).toString(),
        customer.name,
        customer.phone,
        customer.totalOrders.toString(),
        formatCurrency(customer.totalSpent, currency)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      margin: { left: 14, right: 14 }
    });
  }

  addFooter(doc, 1, branding);
  doc.save(`top-customers-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`);
}

export function exportTopProductsPDF(
  data: ReportsData,
  startDate: Date,
  endDate: Date,
  branding: CompanyBranding,
  currency = 'BDT'
): void {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'Top Products Report', startDate, endDate, branding);

  // Top Products Table
  if (data.topProducts.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Top 10 Products by Revenue', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Product Name', 'SKU', 'Units Sold', 'Revenue', 'Profit']],
      body: data.topProducts.map((product, index) => [
        (index + 1).toString(),
        product.name,
        product.sku || '-',
        product.quantitySold.toString(),
        formatCurrency(product.revenue, currency),
        formatCurrency(product.profit, currency)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      didParseCell: (cellData) => {
        if (cellData.column.index === 5 && cellData.section === 'body') {
          const profit = data.topProducts[cellData.row.index]?.profit || 0;
          cellData.cell.styles.textColor = profit >= 0 ? [22, 163, 74] : [220, 38, 38];
        }
      },
      margin: { left: 14, right: 14 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Category Performance
  if (data.categoryPerformance.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Category Performance', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Products', 'Units Sold', 'Revenue']],
      body: data.categoryPerformance.map(item => [
        item.category,
        item.products.toString(),
        item.unitsSold.toString(),
        formatCurrency(item.revenue, currency)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128] },
      margin: { left: 14, right: 14 }
    });
  }

  addFooter(doc, 1, branding);
  doc.save(`top-products-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`);
}

export function exportOverviewPDF(
  data: ReportsData,
  startDate: Date,
  endDate: Date,
  branding: CompanyBranding,
  currency = 'BDT'
): void {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'Business Overview Report', startDate, endDate, branding);

  // Primary KPIs
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Primary KPIs', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value', 'vs Previous Period']],
    body: [
      ['Total Revenue', formatCurrency(data.summary.totalRevenue, currency), formatChange(data.summary.revenueChange)],
      ['Total Orders', data.summary.totalOrders.toString(), formatChange(data.summary.ordersChange)],
      ['Average Order Value', formatCurrency(data.summary.averageOrderValue, currency), formatChange(data.summary.aovChange)],
      ['Gross Profit Margin', `${data.summary.grossProfitMargin.toFixed(1)}%`, '-'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Secondary KPIs
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Secondary KPIs', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value', 'vs Previous Period']],
    body: [
      ['New Customers', data.summary.newCustomers.toString(), formatChange(data.summary.customersChange)],
      ['Messages Sent', data.summary.messagesSent.toString(), formatChange(data.summary.messagesChange)],
      ['Open Complaints', data.summary.openComplaints.toString(), '-'],
      ['Collection Rate', `${data.summary.collectionRate.toFixed(1)}%`, '-'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [107, 114, 128], textColor: 255 },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Profit & Loss Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Profit & Loss Summary', 14, yPosition);
  yPosition += 8;

  const pl = data.profitLoss;
  autoTable(doc, {
    startY: yPosition,
    body: [
      ['Revenue', formatCurrency(pl.revenue, currency)],
      ['COGS', `-${formatCurrency(pl.cogs, currency)}`],
      ['Gross Profit', formatCurrency(pl.grossProfit, currency)],
      ['Operating Expenses', `-${formatCurrency(pl.operatingExpenses, currency)}`],
      [{ content: 'Net Profit', styles: { fontStyle: 'bold' } }, { content: formatCurrency(pl.netProfit, currency), styles: { fontStyle: 'bold', textColor: pl.netProfit >= 0 ? [22, 163, 74] : [220, 38, 38] } }],
    ],
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 80, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  addFooter(doc, 1, branding);
  doc.save(`business-overview-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`);
}
