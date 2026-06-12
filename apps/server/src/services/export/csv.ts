/**
 * Minimal RFC-4180 CSV serializer for tenant data exports.
 *
 * A field is quoted when it contains a comma, double-quote, CR, or LF; embedded
 * double-quotes are escaped by doubling. Rows are joined with CRLF (the RFC line
 * ending, which Excel/Sheets expect). null/undefined render as an empty field.
 */

/** Escapes a single CSV cell value. */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serializes a header + rows (array of cell arrays) into a CSV string. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
}
