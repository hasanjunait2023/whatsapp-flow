import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { AccountsData } from '@/hooks/useAccounts';

const formatCurrency = (amount: number, currency = 'BDT') => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export function exportIncomeStatementPDF(
  data: AccountsData,
  startDate: Date,
  endDate: Date,
  currency = 'BDT'
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Income Statement', pageWidth / 2, 20, { align: 'center' });
  
  // Period
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Period: ${format(startDate, 'MMMM d, yyyy')} - ${format(endDate, 'MMMM d, yyyy')}`,
    pageWidth / 2,
    30,
    { align: 'center' }
  );
  
  // Generated date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, 38, { align: 'center' });
  doc.setTextColor(0);
  
  let yPosition = 50;
  
  // Revenue Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // Green
  doc.text('REVENUE', 14, yPosition);
  doc.setTextColor(0);
  yPosition += 10;
  
  // Revenue table
  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Amount']],
    body: [
      ['Subscription Payments', formatCurrency(data.totalRevenue, currency)],
    ],
    foot: [['Total Revenue', formatCurrency(data.totalRevenue, currency)]],
    theme: 'plain',
    headStyles: { fillColor: [240, 253, 244], textColor: [22, 163, 74], fontStyle: 'bold' },
    footStyles: { fillColor: [240, 253, 244], textColor: [22, 163, 74], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Expenses Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // Red
  doc.text('EXPENSES', 14, yPosition);
  doc.setTextColor(0);
  yPosition += 10;
  
  // Expenses table
  const expenseRows = data.expensesByCategory.length > 0
    ? data.expensesByCategory.map(cat => [cat.category, formatCurrency(cat.amount, currency)])
    : [['No expenses recorded', '-']];
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Category', 'Amount']],
    body: expenseRows,
    foot: [['Total Expenses', formatCurrency(data.totalExpenses, currency)]],
    theme: 'plain',
    headStyles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: 'bold' },
    footStyles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 20;
  
  // Net Income Section
  const netColor = data.netIncome >= 0 ? [22, 163, 74] : [220, 38, 38];
  
  autoTable(doc, {
    startY: yPosition,
    body: [
      ['NET INCOME', formatCurrency(data.netIncome, currency)],
      ['Profit Margin', `${data.profitMargin.toFixed(1)}%`]
    ],
    theme: 'plain',
    styles: { fontSize: 14, fontStyle: 'bold' },
    bodyStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right', textColor: netColor as [number, number, number] }
    },
    margin: { left: 14, right: 14 }
  });
  
  // Save PDF
  const fileName = `income-statement-${format(startDate, 'yyyy-MM')}-to-${format(endDate, 'yyyy-MM')}.pdf`;
  doc.save(fileName);
}

export function exportCashFlowPDF(
  data: AccountsData,
  startDate: Date,
  endDate: Date,
  currency = 'BDT'
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Cash Flow Report', pageWidth / 2, 20, { align: 'center' });
  
  // Period
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Period: ${format(startDate, 'MMMM d, yyyy')} - ${format(endDate, 'MMMM d, yyyy')}`,
    pageWidth / 2,
    30,
    { align: 'center' }
  );
  
  // Generated date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, 38, { align: 'center' });
  doc.setTextColor(0);
  
  let yPosition = 50;
  
  // Summary Section
  const totalInflow = data.cashFlow.reduce((sum, cf) => sum + cf.inflow, 0);
  const totalOutflow = data.cashFlow.reduce((sum, cf) => sum + cf.outflow, 0);
  const netCashFlow = totalInflow - totalOutflow;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', 14, yPosition);
  yPosition += 10;
  
  autoTable(doc, {
    startY: yPosition,
    body: [
      ['Total Cash Inflow', formatCurrency(totalInflow, currency)],
      ['Total Cash Outflow', formatCurrency(totalOutflow, currency)],
      ['Net Cash Flow', formatCurrency(netCashFlow, currency)]
    ],
    theme: 'plain',
    styles: { fontSize: 12 },
    bodyStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'right' }
    },
    didParseCell: (data) => {
      if (data.row.index === 0 && data.column.index === 1) {
        data.cell.styles.textColor = [22, 163, 74];
      }
      if (data.row.index === 1 && data.column.index === 1) {
        data.cell.styles.textColor = [220, 38, 38];
      }
      if (data.row.index === 2 && data.column.index === 1) {
        data.cell.styles.textColor = netCashFlow >= 0 ? [22, 163, 74] : [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Monthly Breakdown
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY BREAKDOWN', 14, yPosition);
  yPosition += 10;
  
  // Calculate running balance
  let runningBalance = 0;
  const cashFlowWithBalance = data.cashFlow.map(cf => {
    runningBalance += cf.net;
    return { ...cf, balance: runningBalance };
  });
  
  const tableBody = cashFlowWithBalance.map(row => [
    row.month,
    formatCurrency(row.inflow, currency),
    formatCurrency(row.outflow, currency),
    `${row.net >= 0 ? '+' : ''}${formatCurrency(row.net, currency)}`,
    formatCurrency(row.balance, currency)
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Month', 'Cash In', 'Cash Out', 'Net', 'Running Balance']],
    body: tableBody,
    foot: [[
      'Total',
      formatCurrency(totalInflow, currency),
      formatCurrency(totalOutflow, currency),
      `${netCashFlow >= 0 ? '+' : ''}${formatCurrency(netCashFlow, currency)}`,
      '—'
    ]],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    footStyles: { fillColor: [249, 250, 251], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 40, halign: 'right' }
    },
    didParseCell: (data) => {
      // Color Cash In green
      if (data.column.index === 1 && data.section === 'body') {
        data.cell.styles.textColor = [22, 163, 74];
      }
      // Color Cash Out red
      if (data.column.index === 2 && data.section === 'body') {
        data.cell.styles.textColor = [220, 38, 38];
      }
      // Color Net based on value
      if (data.column.index === 3) {
        const row = data.section === 'body' ? cashFlowWithBalance[data.row.index] : { net: netCashFlow };
        if (row) {
          data.cell.styles.textColor = row.net >= 0 ? [22, 163, 74] : [220, 38, 38];
        }
      }
      // Color Running Balance
      if (data.column.index === 4 && data.section === 'body') {
        const row = cashFlowWithBalance[data.row.index];
        if (row) {
          data.cell.styles.textColor = row.balance >= 0 ? [59, 130, 246] : [249, 115, 22];
        }
      }
    },
    margin: { left: 14, right: 14 }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Pending Payments Notice
  if (data.pendingPayments > 0) {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, yPosition, pageWidth - 28, 20, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('Pending Cash Inflows', 20, yPosition + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatCurrency(data.pendingPayments, currency)} in payments awaiting verification`, 20, yPosition + 15);
    doc.setTextColor(0);
  }
  
  // Save PDF
  const fileName = `cash-flow-report-${format(startDate, 'yyyy-MM')}-to-${format(endDate, 'yyyy-MM')}.pdf`;
  doc.save(fileName);
}
