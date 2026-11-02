export type ExecuteSqlInput = {
  sql: string;
  args?: Array<string | number | null>;
  readOnly: boolean;
  /** Default 5000. */
  timeoutMs?: number;
  /** Default 200. */
  rowCap?: number;
  /** When aborted, adapters cancel the in-flight statement when possible. */
  signal?: AbortSignal;
};

export type ExecuteSqlResult = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
};

export const DEFAULT_SQL_TIMEOUT_MS = 5_000;
export const DEFAULT_SQL_ROW_CAP = 200;

export function clampSqlTimeout(ms: number | undefined): number {
  if (ms == null || !Number.isFinite(ms)) return DEFAULT_SQL_TIMEOUT_MS;
  return Math.max(100, Math.min(Math.trunc(ms), 60_000));
}

export function clampSqlRowCap(cap: number | undefined): number {
  if (cap == null || !Number.isFinite(cap)) return DEFAULT_SQL_ROW_CAP;
  return Math.max(1, Math.min(Math.trunc(cap), 1_000));
}

/**
 * B11: SQL console guard failures. `code` is stable so the server can map it
 * without importing the class; `committed` tells the caller whether the
 * statement's changes landed (true only for a write that outlived its timeout
 * and then finished).
 */
export type JordSqlConsoleErrorCode =
  | "JORD_SQL_MULTI_STATEMENT"
  | "JORD_SQL_TX_CONTROL"
  | "JORD_SQL_TIMEOUT"
  | "JORD_SQL_CANCELLED";

export class JordSqlConsoleError extends Error {
  readonly code: JordSqlConsoleErrorCode;
  readonly committed: boolean;

  constructor(code: JordSqlConsoleErrorCode, message: string, committed = false) {
    super(message);
    this.name = "JordSqlConsoleError";
    this.code = code;
    this.committed = committed;
  }
}

export function sqlMultiStatementError(): JordSqlConsoleError {
  return new JordSqlConsoleError(
    "JORD_SQL_MULTI_STATEMENT",
    "The SQL console runs one statement per call. Send each statement on its own.",
  );
}

export function sqlTxControlError(): JordSqlConsoleError {
  return new JordSqlConsoleError(
    "JORD_SQL_TX_CONTROL",
    "The SQL console does not accept BEGIN, COMMIT, ROLLBACK, SAVEPOINT or RELEASE. Each call runs and commits on its own.",
  );
}

export function sqlTimeoutError(timeoutMs: number, committed: boolean): JordSqlConsoleError {
  return new JordSqlConsoleError(
    "JORD_SQL_TIMEOUT",
    committed
      ? `Statement exceeded the ${timeoutMs} ms timeout and could not be cancelled. It finished afterwards and its changes were committed.`
      : `Statement exceeded the ${timeoutMs} ms timeout and was cancelled. Nothing was committed.`,
    committed,
  );
}

export function sqlCancelledError(committed = false): JordSqlConsoleError {
  return new JordSqlConsoleError(
    "JORD_SQL_CANCELLED",
    committed
      ? "Statement was cancelled after it finished; its changes were committed."
      : "Statement was cancelled. Nothing was committed.",
    committed,
  );
}

/** True when the leading keyword (after comments) is EXPLAIN. */
export function isExplainSql(sql: string): boolean {
  for (const token of tokenizeSql(sql)) {
    if (token.kind !== "word") break;
    return token.upper === "EXPLAIN";
  }
  return false;
}

/**
 * Extract engine-reported SQL position into 1-based line/column when possible.
 * Postgres `position` is a 1-based character offset into the query text.
 */
export function sqlErrorPosition(
  sql: string,
  err: unknown,
): { line: number; column: number } | null {
  const position = (err as { position?: unknown } | null)?.position;
  const offsetRaw =
    typeof position === "number"
      ? position
      : typeof position === "string"
        ? Number(position)
        : NaN;
  if (!Number.isFinite(offsetRaw) || offsetRaw < 1) return null;
  const offset = Math.min(Math.trunc(offsetRaw), sql.length);
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset - 1; i++) {
    if (sql[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

type SqlToken = { kind: "word"; upper: string } | { kind: "semi" } | { kind: "other" };

/**
 * SQLite-flavoured tokens: skips whitespace and `--` / `/* *\/` comments,
 * folds '…' strings and "…" / `…` / […] identifiers into one token.
 * Unterminated quotes or comments swallow the rest (the engine rejects them).
 */
function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  const n = sql.length;
  let i = 0;
  const skipQuoted = (close: string, doubled: boolean): void => {
    i += 1;
    while (i < n) {
      if (sql[i] === close) {
        if (doubled && sql[i + 1] === close) {
          i += 2;
          continue;
        }
        i += 1;
        return;
      }
      i += 1;
    }
  };
  while (i < n) {
    const ch = sql[i]!;
    if (/\s/.test(ch)) {
      i += 1;
    } else if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? n : end + 1;
    } else if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
    } else if (ch === ";") {
      tokens.push({ kind: "semi" });
      i += 1;
    } else if (ch === "'" || ch === '"' || ch === "`") {
      skipQuoted(ch, true);
      tokens.push({ kind: "other" });
    } else if (ch === "[") {
      skipQuoted("]", false);
      tokens.push({ kind: "other" });
    } else if (/[A-Za-z0-9_$\u0080-\uffff]/.test(ch)) {
      const start = i;
      while (i < n && /[A-Za-z0-9_$\u0080-\uffff]/.test(sql[i]!)) i += 1;
      tokens.push({ kind: "word", upper: sql.slice(start, i).toUpperCase() });
    } else {
      tokens.push({ kind: "other" });
      i += 1;
    }
  }
  return tokens;
}

/**
 * Number of non-empty statements, SQLite rules (mirrors `sqlite3_complete`):
 * inside `CREATE [TEMP] TRIGGER … BEGIN … END`, a `;` only ends the statement
 * when it follows `; END`. Empty statements (`;;`, comments) do not count.
 */
export function countSqliteStatements(sql: string): number {
  type Phase = "start" | "explain" | "create" | "trigger" | "normal";
  let count = 0;
  let phase: Phase = "start";
  let hasTokens = false;
  // Trigger body: 0 = plain, 1 = just saw `;`, 2 = saw `; END`.
  let triggerSemi = 0;
  const endStatement = (): void => {
    if (hasTokens) count += 1;
    phase = "start";
    hasTokens = false;
    triggerSemi = 0;
  };
  for (const token of tokenizeSql(sql)) {
    if (token.kind === "semi") {
      if (phase === "trigger" && triggerSemi !== 2) {
        triggerSemi = 1;
        continue;
      }
      endStatement();
      continue;
    }
    hasTokens = true;
    const word = token.kind === "word" ? token.upper : null;
    switch (phase) {
      case "start":
        phase = word === "EXPLAIN" ? "explain" : word === "CREATE" ? "create" : "normal";
        break;
      case "explain":
        phase = word === "CREATE" ? "create" : "normal";
        break;
      case "create":
        if (word === "TEMP" || word === "TEMPORARY") break;
        phase = word === "TRIGGER" ? "trigger" : "normal";
        break;
      case "trigger":
        triggerSemi = triggerSemi === 1 && word === "END" ? 2 : 0;
        break;
      default:
        break;
    }
  }
  endStatement();
  return count;
}

const TX_CONTROL_WORDS = new Set([
  "BEGIN",
  "COMMIT",
  "END",
  "ROLLBACK",
  "ABORT",
  "SAVEPOINT",
  "RELEASE",
]);

/**
 * True when the statement opens or closes a transaction (both dialects):
 * BEGIN / COMMIT / END / ROLLBACK / ABORT / SAVEPOINT / RELEASE,
 * START TRANSACTION, PREPARE TRANSACTION, COMMIT/ROLLBACK PREPARED.
 * Looks only at the leading keywords, after whitespace and comments.
 */
export function isSqlTransactionControl(sql: string): boolean {
  const lead: string[] = [];
  for (const token of tokenizeSql(sql)) {
    if (token.kind !== "word") break;
    lead.push(token.upper);
    if (lead.length === 2) break;
  }
  const [first, second] = lead;
  if (!first) return false;
  if (TX_CONTROL_WORDS.has(first)) return true;
  return (first === "START" || first === "PREPARE") && second === "TRANSACTION";
}

/**
 * Race `pending` against `timeoutMs`. The timer is cleared on every path.
 * `pending` keeps a handler attached, so a late rejection is never unhandled.
 */
export async function raceSqlTimeout<T>(
  pending: Promise<T>,
  timeoutMs: number,
): Promise<{ kind: "settled"; value: T } | { kind: "timeout" }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ kind: "timeout" }>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
  });
  try {
    return await Promise.race([
      pending.then((value) => ({ kind: "settled" as const, value })),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
