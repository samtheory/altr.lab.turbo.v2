/**
 * SQL language helpers for the Apolyx `SqlEditor` (Jord S0063).
 *
 * Pure TypeScript — no Monaco import — so the completion model, join
 * suggestions, and formatter can be unit-tested without a browser.
 */

export type SqlDialect = "libsql" | "postgres";

export type SqlCompletionColumn = { name: string; type: string; pk?: boolean };

export type SqlCompletionReference = {
  schema?: string;
  table: string;
  columns: string[];
};

export type SqlCompletionForeignKey = {
  columns: string[];
  references: SqlCompletionReference;
};

export type SqlCompletionTable = {
  name: string;
  schema?: string;
  columns: SqlCompletionColumn[];
  foreignKeys?: SqlCompletionForeignKey[];
};

/** Completion source. One model per project — never shared across projects. */
export type SqlCompletionModel = {
  dialect: SqlDialect;
  schemas: string[];
  tables: SqlCompletionTable[];
};

export type SqlCompletionKind =
  | "schema"
  | "table"
  | "column"
  | "function"
  | "keyword"
  | "join";

export type SqlCompletionItem = {
  label: string;
  kind: SqlCompletionKind;
  insertText: string;
  detail?: string;
  /** Multi-line plain text (column list, join hint). */
  documentation?: string;
  filterText?: string;
  sortText?: string;
};

/** Implicit schema per dialect: omit it in generated SQL. */
const IMPLICIT_SCHEMA: Record<SqlDialect, string> = {
  libsql: "main",
  postgres: "public",
};

export function sqlLanguageId(dialect: SqlDialect): string {
  return dialect === "postgres" ? "pgsql" : "sql";
}

const COMMON_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "INSERT INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE FROM",
  "RETURNING",
  "JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "FULL OUTER JOIN",
  "CROSS JOIN",
  "ON",
  "USING",
  "AS",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "IS NULL",
  "IS NOT NULL",
  "IN",
  "BETWEEN",
  "LIKE",
  "EXISTS",
  "DISTINCT",
  "ASC",
  "DESC",
  "UNION",
  "UNION ALL",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "WITH",
  "CREATE TABLE",
  "ALTER TABLE",
  "DROP TABLE",
  "CREATE INDEX",
  "DROP INDEX",
  "PRIMARY KEY",
  "FOREIGN KEY",
  "REFERENCES",
  "NOT NULL",
  "DEFAULT",
  "UNIQUE",
  "CHECK",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "EXPLAIN",
  "ANALYZE",
];

const LIBSQL_KEYWORDS = [
  "PRAGMA",
  "VACUUM",
  "REPLACE INTO",
  "AUTOINCREMENT",
  "WITHOUT ROWID",
  "STRICT",
  "ATTACH DATABASE",
  "DETACH DATABASE",
  "TEMP",
];

const POSTGRES_KEYWORDS = [
  "ILIKE",
  "ON CONFLICT",
  "DO UPDATE",
  "DO NOTHING",
  "TRUNCATE",
  "CASCADE",
  "GENERATED ALWAYS AS IDENTITY",
  "SERIAL",
  "BIGSERIAL",
  "JSONB",
  "UUID",
  "TIMESTAMPTZ",
  "CURRENT_DATE",
  "CURRENT_TIMESTAMP",
  "SET search_path",
];

const COMMON_FUNCTIONS = [
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "COALESCE",
  "NULLIF",
  "CAST",
  "LOWER",
  "UPPER",
  "LENGTH",
  "ABS",
  "ROUND",
  "TRIM",
];

const LIBSQL_FUNCTIONS = [
  "json_extract",
  "json_object",
  "json_array",
  "json_valid",
  "group_concat",
  "strftime",
  "datetime",
  "date",
  "time",
  "julianday",
  "unixepoch",
  "ifnull",
  "instr",
  "printf",
  "substr",
  "replace",
  "random",
  "last_insert_rowid",
];

const POSTGRES_FUNCTIONS = [
  "now",
  "date_trunc",
  "date_part",
  "to_char",
  "to_timestamp",
  "jsonb_build_object",
  "jsonb_set",
  "jsonb_array_elements",
  "gen_random_uuid",
  "array_agg",
  "string_agg",
  "regexp_replace",
  "random",
  "generate_series",
];

export function sqlKeywords(dialect: SqlDialect): string[] {
  const extra = dialect === "postgres" ? POSTGRES_KEYWORDS : LIBSQL_KEYWORDS;
  return [...COMMON_KEYWORDS, ...extra];
}

export function sqlFunctions(dialect: SqlDialect): string[] {
  const extra = dialect === "postgres" ? POSTGRES_FUNCTIONS : LIBSQL_FUNCTIONS;
  return [...COMMON_FUNCTIONS, ...extra];
}

/** Words upper-cased by `formatSql` (outside strings and comments). */
const UPPER_KEYWORDS = new Set<string>(
  [...COMMON_KEYWORDS, ...LIBSQL_KEYWORDS, ...POSTGRES_KEYWORDS].flatMap((k) =>
    k.split(" "),
  ),
);

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Table name as written in SQL: implicitly-schemaed tables stay unqualified. */
export function qualifyTable(
  table: { name: string; schema?: string },
  dialect: SqlDialect,
): string {
  if (!table.schema || table.schema === IMPLICIT_SCHEMA[dialect]) {
    return quoteIdent(table.name);
  }
  return `${quoteIdent(table.schema)}.${quoteIdent(table.name)}`;
}

export function buildSqlCompletionItems(
  model: SqlCompletionModel,
): SqlCompletionItem[] {
  const items: SqlCompletionItem[] = [];

  for (const schema of model.schemas) {
    items.push({
      label: schema,
      kind: "schema",
      insertText: quoteIdent(schema),
      detail: "schema",
      sortText: `1-${schema}`,
    });
  }

  for (const table of model.tables) {
    const qualified = table.schema
      ? `${table.schema}.${table.name}`
      : table.name;
    items.push({
      label: table.name,
      kind: "table",
      insertText: quoteIdent(table.name),
      detail: table.schema ? `table · ${table.schema}` : "table",
      documentation: [
        qualified,
        ...table.columns.map((c) => `  ${c.name} ${c.type}`),
      ].join("\n"),
      filterText: `${qualified} ${table.name}`,
      sortText: `2-${qualified}`,
    });
    for (const column of table.columns) {
      items.push({
        label: column.name,
        kind: "column",
        insertText: quoteIdent(column.name),
        detail: `${qualified}.${column.name} · ${column.type}${
          column.pk ? " · pk" : ""
        }`,
        filterText: `${table.name}.${column.name} ${column.name}`,
        sortText: `3-${qualified}.${column.name}`,
      });
    }
  }

  for (const fn of sqlFunctions(model.dialect)) {
    items.push({
      label: fn,
      kind: "function",
      insertText: `${fn}()`,
      detail: "function",
      sortText: `4-${fn}`,
    });
  }

  for (const keyword of sqlKeywords(model.dialect)) {
    items.push({
      label: keyword,
      kind: "keyword",
      insertText: keyword,
      detail: "keyword",
      sortText: `5-${keyword}`,
    });
  }

  return items;
}

/**
 * FK edges as ready-to-insert `a.col = b.col` comparisons. Every edge names both
 * sides so the suggestion is unambiguous across schemas.
 */
export function fkJoinSuggestions(
  model: SqlCompletionModel,
): SqlCompletionItem[] {
  const items: SqlCompletionItem[] = [];
  const seen = new Set<string>();

  for (const table of model.tables) {
    for (const fk of table.foreignKeys ?? []) {
      const target = model.tables.find(
        (t) =>
          t.name === fk.references.table &&
          (!fk.references.schema ||
            !t.schema ||
            t.schema === fk.references.schema),
      );
      const pairs = fk.columns.map((column, index) => ({
        from: column,
        to: fk.references.columns[index] ?? fk.references.columns[0] ?? "",
      }));

      for (const pair of pairs) {
        if (!pair.from || !pair.to) continue;
        const left = `${qualifyTable(table, model.dialect)}.${quoteIdent(pair.from)}`;
        const targetTable = target ?? {
          name: fk.references.table,
          schema: fk.references.schema,
        };
        const right = `${qualifyTable(targetTable, model.dialect)}.${quoteIdent(pair.to)}`;
        const insertText = `${left} = ${right}`;
        if (seen.has(insertText)) continue;
        seen.add(insertText);
        items.push({
          label: `${table.name}.${pair.from} = ${fk.references.table}.${pair.to}`,
          kind: "join",
          insertText,
          detail: "fk join condition",
          documentation: `Foreign key${fk.columns.length > 1 ? " (composite)" : ""}: ${table.name}(${fk.columns.join(", ")}) → ${fk.references.table}(${fk.references.columns.join(", ")})`,
          filterText: `${table.name} ${pair.from} ${fk.references.table} ${pair.to} join`,
          sortText: `0-${insertText}`,
        });
      }
    }
  }

  return items;
}

const JOIN_CONTEXT_RE = /\bon\s+[\w."`[\]]*$/i;

/** True while the cursor sits in an `ON …` join condition. */
export function isJoinConditionContext(textBeforeCursor: string): boolean {
  const tail = textBeforeCursor.slice(-240);
  return JOIN_CONTEXT_RE.test(tail);
}

type Token = {
  kind: "ws" | "string" | "comment" | "word" | "other";
  text: string;
};

function tokenize(sql: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i]!;
    if (/\s/.test(ch)) {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j]!)) j += 1;
      out.push({ kind: "ws", text: sql.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      let j = i;
      while (j < sql.length && sql[j] !== "\n") j += 1;
      out.push({ kind: "comment", text: sql.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      const j = end === -1 ? sql.length : end + 2;
      out.push({ kind: "comment", text: sql.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2;
            continue;
          }
          j += 1;
          break;
        }
        j += 1;
      }
      out.push({ kind: "string", text: sql.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < sql.length && /[A-Za-z0-9_$]/.test(sql[j]!)) j += 1;
      out.push({ kind: "word", text: sql.slice(i, j) });
      i = j;
      continue;
    }
    out.push({ kind: "other", text: ch });
    i += 1;
  }
  return out;
}

const SINGLE_CLAUSES = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "VALUES",
  "UPDATE",
  "SET",
  "RETURNING",
  "WITH",
  "UNION",
  "JOIN",
  "ON",
  "USING",
]);

const JOIN_PRELUDE = new Set(["LEFT", "RIGHT", "INNER", "FULL", "CROSS", "OUTER"]);

function clauseLength(words: string[], index: number): number {
  const a = words[index] ?? "";
  const b = words[index + 1] ?? "";
  const c = words[index + 2] ?? "";
  if (a === "GROUP" && b === "BY") return 2;
  if (a === "ORDER" && b === "BY") return 2;
  if (a === "INSERT" && b === "INTO") return 2;
  if (a === "DELETE" && b === "FROM") return 2;
  if (a === "UNION" && b === "ALL") return 2;
  if (a === "ON" && b === "CONFLICT") return 2;
  if (JOIN_PRELUDE.has(a) && b === "JOIN") return 2;
  if ((a === "LEFT" || a === "RIGHT" || a === "FULL") && b === "OUTER" && c === "JOIN")
    return 3;
  if (SINGLE_CLAUSES.has(a)) return 1;
  return 0;
}

/**
 * Lightweight dialect-agnostic SQL formatter used by the editor's
 * "Format document" action. Uppercases keywords, puts major clauses on their
 * own line, and breaks AND/OR onto indented lines. String literals, quoted
 * identifiers, and comments are copied verbatim.
 */
export function formatSql(input: string): string {
  const tokens = tokenize(input);
  // Word-only view of the stream: clause lookahead skips interleaved whitespace.
  const wordsInOrder: string[] = [];
  const wordIndexAt: number[] = [];
  for (const token of tokens) {
    if (token.kind === "word") {
      wordIndexAt.push(wordsInOrder.length);
      wordsInOrder.push(token.text.toUpperCase());
    } else {
      wordIndexAt.push(-1);
    }
  }

  const out: string[] = [];
  let pendingSpace = false;

  const lastChar = () => out[out.length - 1] ?? "";
  const trimTrailingSpace = () => {
    while (out.length > 0 && out[out.length - 1] === " ") out.pop();
  };
  const newline = (indent = 0) => {
    trimTrailingSpace();
    if (out.length === 0) return;
    out.push(`\n${" ".repeat(indent)}`);
    pendingSpace = false;
  };
  const atLineStart = () =>
    out.length === 0 || lastChar().endsWith("\n") || lastChar() === "";

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i]!;

    if (token.kind === "ws") {
      pendingSpace = true;
      i += 1;
      continue;
    }

    if (token.kind === "comment") {
      if (!atLineStart()) newline();
      out.push(token.text);
      newline();
      i += 1;
      continue;
    }

    if (token.kind === "word") {
      const wordPos = wordIndexAt[i] ?? -1;
      const span = wordPos >= 0 ? clauseLength(wordsInOrder, wordPos) : 0;
      if (span > 0 && !atLineStart()) {
        newline();
      }
      if (span > 0) {
        out.push(wordsInOrder.slice(wordPos, wordPos + span).join(" "));
        let remaining = span;
        let j = i;
        while (j < tokens.length && remaining > 0) {
          if (tokens[j]!.kind === "word") remaining -= 1;
          j += 1;
        }
        i = j;
        pendingSpace = true;
        continue;
      }
      const upper = wordsInOrder[wordPos] ?? token.text.toUpperCase();
      if ((upper === "AND" || upper === "OR") && !atLineStart()) {
        newline(2);
        out.push(upper);
        i += 1;
        pendingSpace = true;
        continue;
      }
      if (pendingSpace && !atLineStart()) out.push(" ");
      out.push(UPPER_KEYWORDS.has(upper) ? upper : token.text);
      pendingSpace = false;
      i += 1;
      continue;
    }

    // Punctuation.
    const ch = token.text;
    if (ch === "(") {
      trimTrailingSpace();
      out.push("(");
      pendingSpace = false;
      i += 1;
      continue;
    }
    if (ch === ")") {
      trimTrailingSpace();
      out.push(")");
      pendingSpace = false;
      i += 1;
      continue;
    }
    if (ch === ",") {
      trimTrailingSpace();
      out.push(",");
      pendingSpace = true;
      i += 1;
      continue;
    }
    if (ch === ";") {
      trimTrailingSpace();
      out.push(";");
      newline();
      i += 1;
      continue;
    }
    if (ch === ".") {
      trimTrailingSpace();
      out.push(".");
      pendingSpace = false;
      i += 1;
      continue;
    }
    if (ch === " " && pendingSpace) {
      i += 1;
      continue;
    }
    if (pendingSpace && !atLineStart()) out.push(" ");
    out.push(ch);
    pendingSpace = false;
    i += 1;
  }

  return `${out.join("").replace(/[ \t]+$/gm, "").trim()}\n`;
}
