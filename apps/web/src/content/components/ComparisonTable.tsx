/**
 * Honest comparison matrix for /compare pages (SEO-GEO-PLAN §2). Cells are a
 * tri-state: yes / no / a short qualifier string — AI engines cross-check
 * these, so keep them specific and truthful.
 */
export type Cell = "yes" | "no" | string;

export interface ComparisonColumn {
  /** Product / tool name shown in the header. */
  name: string;
  /** Highlight our own column. */
  highlight?: boolean;
}

export interface ComparisonRow {
  /** Dimension being compared (e.g. "Official WhatsApp API"). */
  dimension: string;
  /** One cell per column, in column order. */
  cells: readonly Cell[];
}

interface ComparisonTableProps {
  caption: string;
  columns: readonly ComparisonColumn[];
  rows: readonly ComparisonRow[];
}

function CellContent({ value }: { value: Cell }) {
  if (value === "yes") {
    return (
      <span style={{ color: "var(--lp-green-text)" }} aria-label="Yes">
        ✓ Yes
      </span>
    );
  }
  if (value === "no") {
    return (
      <span style={{ color: "var(--lp-text-dim)" }} aria-label="No">
        — No
      </span>
    );
  }
  return <span className="text-lp-muted">{value}</span>;
}

export function ComparisonTable({ caption, columns, rows }: ComparisonTableProps) {
  return (
    <div className="mt-6 overflow-x-auto rounded-[var(--lp-r-lg)] border border-[var(--lp-border)]">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-[var(--lp-surface-2)]">
            <th scope="col" className="p-3 font-semibold text-lp-text">
              Dimension
            </th>
            {columns.map((col) => (
              <th
                key={col.name}
                scope="col"
                className="p-3 font-semibold"
                style={
                  col.highlight
                    ? { color: "var(--lp-violet-300)" }
                    : { color: "var(--lp-text)" }
                }
              >
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dimension} className="border-t border-[var(--lp-border)]">
              <th
                scope="row"
                className="p-3 font-medium text-lp-text"
                style={{ background: "var(--lp-surface)" }}
              >
                {row.dimension}
              </th>
              {row.cells.map((cell, index) => (
                <td
                  key={columns[index]?.name ?? index}
                  className="p-3"
                  style={columns[index]?.highlight ? { background: "var(--lp-elevated)" } : undefined}
                >
                  <CellContent value={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
