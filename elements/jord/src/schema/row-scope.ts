import type { RowScope } from "../port.js";
import { quoteIdent } from "./ddl.js";

/**
 * Boolean SQL for a row scope: `(a = ? AND b = ?) OR (c = ?)`.
 * A predicate naming a column the table does not have matches nothing.
 * `mark(n)` returns the placeholder for the n-th pushed arg (1-based).
 */
export function rowScopeSql(
  scope: RowScope,
  columns: readonly string[],
  args: Array<string | number | null>,
  mark: (n: number) => string = () => "?",
): string {
  if (scope.anyOf.some((predicate) => predicate.length === 0)) return "(1 = 1)";
  const ors: string[] = [];
  for (const predicate of scope.anyOf) {
    if (predicate.some((term) => !columns.includes(term.column))) continue;
    const ands = predicate.map((term) => {
      args.push(term.value);
      return `${quoteIdent(term.column)} = ${mark(args.length)}`;
    });
    ors.push(`(${ands.join(" AND ")})`);
  }
  if (ors.length === 0) return "(1 = 0)";
  return `(${ors.join(" OR ")})`;
}
