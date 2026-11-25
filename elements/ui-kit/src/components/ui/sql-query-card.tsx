"use client";

import * as React from "react";
import { Database } from "lucide-react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type SqlQueryColumn = {
  key: string;
  header: string;
};

export type SqlQueryRow = Record<string, string | number>;

export type SqlQueryCardProps = {
  title?: string;
  query?: string;
  columns?: SqlQueryColumn[];
  rows?: SqlQueryRow[];
  rowCount?: number;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_QUERY = `SELECT id, total, status
FROM invoices
WHERE customer_id = $1
LIMIT 5;`;

const DEMO_COLUMNS: SqlQueryColumn[] = [
  { key: "id", header: "id" },
  { key: "total", header: "total" },
  { key: "status", header: "status" },
];

const DEMO_ROWS: SqlQueryRow[] = [
  { id: "inv_901", total: 120.0, status: "paid" },
  { id: "inv_902", total: 42.5, status: "open" },
  { id: "inv_903", total: 890.0, status: "disputed" },
];

/** Presentational card showing a SQL query and result table. */
export function SqlQueryCard({
  title = "Query result",
  query: queryProp,
  columns: columnsProp,
  rows: rowsProp,
  rowCount,
  autoPlay = false,
  className,
}: SqlQueryCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlay) return;
    const io = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  const query = queryProp ?? (autoPlay ? DEMO_QUERY : "");
  const columns = columnsProp ?? (autoPlay ? DEMO_COLUMNS : []);
  const rows = rowsProp ?? (autoPlay ? DEMO_ROWS : []);
  const count = rowCount ?? rows.length;

  return (
    <div
      ref={ref}
      data-slot="sql-query-card"
      className={cn(
        "w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xs",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Database className="size-3.5 text-muted-foreground" aria-hidden />
        <p className="text-xs font-semibold">{title}</p>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{count} rows</span>
      </div>
      {query ? (
        <pre
          className={cn(
            "max-h-28 overflow-auto border-b border-border bg-muted/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground",
            autoPlay && visible && !reduce && "apolyx-tool-shimmer",
          )}
        >
          {query}
        </pre>
      ) : null}
      {columns.length > 0 && rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[16rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {columns.map((col) => (
                  <th key={col.key} className="px-3 py-1.5 font-medium text-muted-foreground">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-1.5 font-mono tabular-nums">
                      {String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}