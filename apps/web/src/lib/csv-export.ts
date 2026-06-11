interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: unknown, row: T) => string;
}

export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create header row
  const headers = columns.map((col) => `"${col.header}"`).join(',');

  // Create data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const keys = (col.key as string).split('.');
        let value: unknown = row;
        
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = (value as Record<string, unknown>)[key];
          } else {
            value = undefined;
          }
        }

        if (col.formatter) {
          return `"${escapeCSV(col.formatter(value, row))}"`;
        }

        if (value === null || value === undefined) {
          return '""';
        }

        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }

        if (typeof value === 'boolean') {
          return value ? '"Yes"' : '"No"';
        }

        return `"${escapeCSV(String(value))}"`;
      })
      .join(',');
  });

  // Combine headers and rows
  const csv = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
  // Escape double quotes by doubling them
  return value.replace(/"/g, '""');
}
