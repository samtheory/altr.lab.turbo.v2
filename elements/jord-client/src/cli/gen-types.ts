/**
 * Pure generator for `jord gen types` (S0087). No I/O, no clock, no env:
 * the same schema snapshot always yields byte-identical output.
 */

export type GenColumn = {
  name: string;
  /** Raw dialect type (fallback when `logicalType` is absent). */
  type: string;
  notnull: boolean;
  pk: boolean;
  dflt_value: string | null;
  logicalType?:
    | { kind: "known"; id: string; params?: Record<string, number | string> }
    | { kind: "custom"; raw: string };
};

export type GenForeignKey = {
  columns: string[];
  references: { schema: string; table: string; columns: string[] };
};

export type GenTable = {
  name: string;
  columns: GenColumn[];
  foreignKeys?: GenForeignKey[];
};

export type GenSchema = { schema: string; tables: GenTable[] };

export type GenOptions = {
  /** Flags echoed in the header (never the URL or token). */
  command?: string;
};

type TsType = { ts: string; note?: string };

/** Logical type id -> TS type. Echoed in the generated header. */
export const TYPE_MAP: ReadonlyArray<readonly [string, string, string]> = [
  ["integer, smallint, real, double", "number", ""],
  ["bigint, numeric, decimal", "string", "lossless; avoids float rounding"],
  ["boolean", "boolean", ""],
  ["text, varchar, char, citext, uuid, enum_text", "string", ""],
  ["date, datetime, timestamp, timestamptz, time, timetz", "string", "ISO-8601"],
  ["inet, cidr, macaddr", "string", ""],
  ["json, jsonb", "unknown", ""],
  ["blob (bytea)", "string", "base64"],
  ["array", "unknown[]", ""],
  ["vector, halfvec, f32_blob", "number[]", ""],
  ["anything else", "unknown", "commented in output"],
];

const BY_ID: Record<string, string> = {
  integer: "number",
  smallint: "number",
  real: "number",
  double: "number",
  bigint: "string",
  numeric: "string",
  decimal: "string",
  boolean: "boolean",
  text: "string",
  varchar: "string",
  char: "string",
  citext: "string",
  uuid: "string",
  enum_text: "string",
  date: "string",
  datetime: "string",
  timestamp: "string",
  timestamptz: "string",
  time: "string",
  timetz: "string",
  inet: "string",
  cidr: "string",
  macaddr: "string",
  json: "unknown",
  jsonb: "unknown",
  blob: "string",
  bytea: "string",
  array: "unknown[]",
  vector: "number[]",
  halfvec: "number[]",
  f32_blob: "number[]",
};

const INTEGER_IDS = new Set(["integer", "smallint", "bigint"]);

function columnTypeId(col: GenColumn): string {
  const lt = col.logicalType;
  if (lt && lt.kind === "known") return lt.id.toLowerCase();
  const raw = (lt && lt.kind === "custom" ? lt.raw : col.type).trim().toLowerCase();
  // `vector(1536)`, `varchar(20)` -> base name
  return raw.replace(/\(.*$/, "").trim();
}

export function mapColumnType(col: GenColumn): TsType {
  const id = columnTypeId(col);
  // Own keys only: a type named "constructor" / "__proto__" must not hit Object.prototype.
  const ts = Object.hasOwn(BY_ID, id) ? BY_ID[id] : undefined;
  if (typeof ts === "string") return { ts };
  return { ts: "unknown", note: `unmapped type ${oneLine(col.type)}` };
}

function oneLine(s: string): string {
  return s.replace(LINEBREAKS, " ").split("*/").join("* /");
}

const LINEBREAKS = new RegExp("[\\r\\n\\u2028\\u2029]+", "g");

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Single-quoted string literal with fixed escaping. */
export function quote(s: string): string {
  return (
    "'" +
    s
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .split("\u2028")
      .join("\\u2028")
      .split("\u2029")
      .join("\\u2029") +
    "'"
  );
}

export function propKey(name: string): string {
  return IDENT.test(name) ? name : quote(name);
}

type Prepared = {
  col: GenColumn;
  ts: string;
  nullable: boolean;
  insertOptional: boolean;
  doc: string[];
};

function prepare(table: GenTable, schema: string): Prepared[] {
  const pkCols = table.columns.filter((c) => c.pk);
  const fkByCol = new Map<string, string>();
  for (const fk of table.foreignKeys ?? []) {
    fk.columns.forEach((c, i) => {
      const target = fk.references;
      const tcol = target.columns[i] ?? "?";
      const ref = `${target.schema || schema}.${target.table}(${tcol})`;
      if (!fkByCol.has(c)) fkByCol.set(c, ref);
    });
  }
  return [...table.columns]
    .sort((a, b) => cmp(a.name, b.name))
    .map((col) => {
      const mapped = mapColumnType(col);
      const nullable = !col.notnull && !col.pk;
      const identity =
        col.pk && pkCols.length === 1 && INTEGER_IDS.has(columnTypeId(col));
      const insertOptional = nullable || col.dflt_value !== null || identity;
      const doc: string[] = [];
      if (col.pk) doc.push("primary key");
      if (identity) doc.push("identity");
      const fk = fkByCol.get(col.name);
      if (fk) doc.push(`references ${fk}`);
      if (mapped.note) doc.push(mapped.note);
      return {
        col,
        ts: mapped.ts,
        nullable,
        insertOptional,
        doc: doc.map(oneLine),
      };
    });
}

function renderBlock(
  rows: Prepared[],
  mode: "Row" | "Insert" | "Update",
  indent: string,
): string[] {
  const out: string[] = [];
  for (const p of rows) {
    if (mode === "Row" && p.doc.length) {
      out.push(`${indent}/** ${p.doc.join("; ")} */`);
    }
    const optional =
      mode === "Update" || (mode === "Insert" && p.insertOptional);
    const type = p.nullable ? `${p.ts} | null` : p.ts;
    out.push(`${indent}${propKey(p.col.name)}${optional ? "?" : ""}: ${type};`);
  }
  return out;
}

export function generateTypes(
  input: GenSchema,
  options: GenOptions = {},
): string {
  const lines: string[] = [];
  const command = options.command ?? `jord gen types --schema ${input.schema}`;
  lines.push(`// Generated by: ${oneLine(command)}`);
  lines.push("// Do not edit by hand; re-run the command (or use --check in CI).");
  lines.push("//");
  lines.push("// Logical type -> TypeScript mapping:");
  for (const [ids, ts, note] of TYPE_MAP) {
    lines.push(`//   ${ids} -> ${ts}${note ? ` (${note})` : ""}`);
  }
  lines.push("//   nullable columns add `| null`");
  lines.push(
    "//   Insert: nullable, defaulted and single-integer-PK (identity) columns are optional",
  );
  lines.push("//   Update: every column is optional");
  lines.push("");
  lines.push("export interface Database {");

  const tables = [...input.tables].sort((a, b) => cmp(a.name, b.name));
  tables.forEach((table, i) => {
    const rows = prepare(table, input.schema);
    const key = `${input.schema}.${table.name}`;
    if (i > 0) lines.push("");
    const pk = rows.filter((r) => r.col.pk).map((r) => r.col.name);
    lines.push(
      `  /** table ${oneLine(key)}${pk.length ? `; primary key (${oneLine(pk.join(", "))})` : ""} */`,
    );
    lines.push(`  ${quote(key)}: {`);
    for (const mode of ["Row", "Insert", "Update"] as const) {
      lines.push(`    ${mode}: {`);
      lines.push(...renderBlock(rows, mode, "      "));
      lines.push("    };");
    }
    lines.push("  };");
  });

  lines.push("}");
  lines.push("");
  lines.push("export type TableName = keyof Database;");
  lines.push("export type TableRow<T extends TableName> = Database[T]['Row'];");
  lines.push("export type TableInsert<T extends TableName> = Database[T]['Insert'];");
  lines.push("export type TableUpdate<T extends TableName> = Database[T]['Update'];");
  lines.push("");
  return lines.join("\n");
}
