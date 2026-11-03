import { isValidSqlIdent, type JordColumnInfo, type JordTableInfo } from "@altr/jord";

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 1000;
export const MAX_IN_VALUES = 100;

export const FILTER_OPS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "in",
  "is",
] as const;

export type FilterOp = (typeof FILTER_OPS)[number];

export type SqlValue = string | number | null;

export type Filter = {
  column: string;
  op: FilterOp;
  /** Bound values. Empty for `is.null` / `is.notnull`. */
  values: SqlValue[];
  isNull?: boolean;
  isNotNull?: boolean;
};

export type ParsedTableQuery = {
  select: string[] | null;
  order: Array<{ column: string; dir: "asc" | "desc" }>;
  limit: number;
  offset: number;
  filters: Filter[];
  all: boolean;
  pk: string[];
  count: "none" | "planned" | "exact";
  representation: boolean;
  /** Keyset mode when non-null; "" = first page (S0079). */
  cursor?: string | null;
  /** One-level FK embeds from `select=*,author(*)` (S0078). Empty when none. */
  embeds?: EmbedSpec[];
};

/** `[alias:]relation(cols)` inside `select` (S0078). `columns` null = all. */
export type EmbedSpec = {
  /** Response key: the alias, else the relation name. */
  key: string;
  relation: string;
  columns: string[] | null;
};

export const MAX_EMBEDS = 8;

export class TableApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: string;
  readonly reason?: string;
  /** Valid alternatives (e.g. relation names for `unknown_relation`). */
  readonly available?: string[];

  constructor(
    status: number,
    code: string,
    message: string,
    extra?: { field?: string; reason?: string; available?: string[] },
  ) {
    super(message);
    this.name = "TableApiError";
    this.status = status;
    this.code = code;
    this.field = extra?.field;
    this.reason = extra?.reason;
    this.available = extra?.available;
  }
}

const RESERVED_PARAMS = new Set([
  "select",
  "order",
  "limit",
  "offset",
  "all",
  "pk",
  "cursor",
  // Schema scope (S0049): a column named `schema` cannot be filtered by name.
  "schema",
]);

function columnMap(info: JordTableInfo): Map<string, JordColumnInfo> {
  return new Map(info.columns.map((col) => [col.name, col]));
}

function requireColumn(info: JordTableInfo, name: string): JordColumnInfo {
  if (!isValidSqlIdent(name)) {
    throw new TableApiError(400, "bad_column", `column ${name} is not allowed`);
  }
  const col = columnMap(info).get(name);
  if (!col) {
    throw new TableApiError(400, "bad_column", `unknown column ${name}`);
  }
  return col;
}

function columnKind(type: string): "int" | "real" | "text" {
  const t = type.toUpperCase();
  if (t.includes("INT")) return "int";
  if (t.includes("REAL") || t.includes("FLOA") || t.includes("DOUB")) return "real";
  return "text";
}

export function coerceColumnValue(col: JordColumnInfo, raw: string): SqlValue {
  if (raw === "null") return null;
  const kind = columnKind(col.type);
  if (kind === "int") {
    if (!/^-?\d+$/.test(raw)) {
      throw new TableApiError(400, "bad_value", `${col.name} must be an integer`);
    }
    return Number(raw);
  }
  if (kind === "real") {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      throw new TableApiError(400, "bad_value", `${col.name} must be a number`);
    }
    return n;
  }
  return raw;
}

function parseOpValue(raw: string): { op: FilterOp; rest: string } {
  const dot = raw.indexOf(".");
  if (dot <= 0) {
    throw new TableApiError(400, "bad_filter", "filter must be op.value");
  }
  const op = raw.slice(0, dot);
  if (!(FILTER_OPS as readonly string[]).includes(op)) {
    throw new TableApiError(400, "bad_filter", `unknown operator ${op}`);
  }
  return { op: op as FilterOp, rest: raw.slice(dot + 1) };
}

function parseFilter(info: JordTableInfo, column: string, raw: string): Filter {
  const col = requireColumn(info, column);
  const { op, rest } = parseOpValue(raw);
  if (op === "is") {
    if (rest === "null") return { column, op, values: [], isNull: true };
    if (rest === "notnull") return { column, op, values: [], isNotNull: true };
    throw new TableApiError(400, "bad_filter", "is expects null or notnull");
  }
  if (op === "in") {
    const inner = rest.startsWith("(") && rest.endsWith(")") ? rest.slice(1, -1) : rest;
    const parts = inner.length === 0 ? [] : inner.split(",");
    if (parts.length > MAX_IN_VALUES) {
      throw new TableApiError(400, "cap_exceeded", `in() max is ${MAX_IN_VALUES}`);
    }
    return {
      column,
      op,
      values: parts.map((part) => coerceColumnValue(col, part)),
    };
  }
  return { column, op, values: [coerceColumnValue(col, rest)] };
}

function parsePrefer(header: string | undefined): {
  count: ParsedTableQuery["count"];
  representation: boolean;
} {
  const raw = header ?? "";
  const parts = raw.split(",").map((p) => p.trim().toLowerCase());
  let count: ParsedTableQuery["count"] = "none";
  if (parts.some((p) => p === "count=exact")) count = "exact";
  else if (parts.some((p) => p === "count=planned")) count = "planned";
  return {
    count,
    representation: parts.some((p) => p === "return=representation"),
  };
}

export function parseTableQuery(
  info: JordTableInfo,
  search: URLSearchParams,
  prefer: string | undefined,
): ParsedTableQuery {
  const pref = parsePrefer(prefer);
  let limit = DEFAULT_LIMIT;
  const limitRaw = search.get("limit");
  if (limitRaw != null && limitRaw !== "") {
    if (!/^\d+$/.test(limitRaw)) {
      throw new TableApiError(400, "bad_limit", "limit must be an integer");
    }
    limit = Number(limitRaw);
    if (limit > MAX_LIMIT) {
      throw new TableApiError(400, "cap_exceeded", `limit max is ${MAX_LIMIT}`);
    }
    if (limit < 1) {
      throw new TableApiError(400, "bad_limit", "limit must be at least 1");
    }
  }
  let offset = 0;
  const offsetRaw = search.get("offset");
  if (offsetRaw != null && offsetRaw !== "") {
    if (!/^\d+$/.test(offsetRaw)) {
      throw new TableApiError(400, "bad_offset", "offset must be an integer");
    }
    offset = Number(offsetRaw);
  }

  let select: string[] | null = null;
  let embeds: EmbedSpec[] = [];
  const selectRaw = search.get("select");
  if (selectRaw != null && selectRaw !== "" && selectRaw !== "*") {
    const parsedSelect = parseSelect(info, selectRaw);
    select = parsedSelect.select;
    embeds = parsedSelect.embeds;
  }

  const order: ParsedTableQuery["order"] = [];
  const orderRaw = search.get("order");
  if (orderRaw) {
    for (const piece of orderRaw.split(",")) {
      const [name, dirRaw] = piece.split(".");
      const column = requireColumn(info, (name ?? "").trim()).name;
      const dir = (dirRaw ?? "asc").toLowerCase();
      if (dir !== "asc" && dir !== "desc") {
        throw new TableApiError(400, "bad_order", "order direction must be asc or desc");
      }
      order.push({ column, dir });
    }
  }

  const filters: Filter[] = [];
  for (const [key, value] of search.entries()) {
    if (RESERVED_PARAMS.has(key)) continue;
    filters.push(parseFilter(info, key, value));
  }

  return {
    select,
    order,
    limit,
    offset,
    filters,
    all: search.get("all") === "true",
    pk: search.getAll("pk"),
    count: pref.count,
    representation: pref.representation,
    cursor: search.get("cursor"),
    embeds,
  };
}

/** Split on commas that are not inside parentheses. */
function splitTopLevel(raw: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth < 0) throw new TableApiError(400, "bad_select", "unbalanced parentheses in select");
    } else if (ch === "," && depth === 0) {
      parts.push(raw.slice(start, i));
      start = i + 1;
    }
  }
  if (depth !== 0) throw new TableApiError(400, "bad_select", "unbalanced parentheses in select");
  parts.push(raw.slice(start));
  return parts.map((part) => part.trim());
}

const EMBED_RE = /^(?:([A-Za-z_][A-Za-z0-9_]*)\s*:\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/s;

/**
 * `select` grammar (S0078):
 *   select := item ("," item)*
 *   item   := "*" | column | [alias ":"] relation "(" inner ")"
 *   inner  := "*" | column ("," column)*        -- one level only, no nested embeds
 * Root columns are validated here; embed columns are validated against the related table later.
 */
function parseSelect(
  info: JordTableInfo,
  raw: string,
): { select: string[] | null; embeds: EmbedSpec[] } {
  let star = false;
  const columns: string[] = [];
  const embeds: EmbedSpec[] = [];
  for (const item of splitTopLevel(raw)) {
    if (item === "*") {
      star = true;
      continue;
    }
    if (!item.includes("(")) {
      columns.push(requireColumn(info, item).name);
      continue;
    }
    const match = EMBED_RE.exec(item);
    if (!match) throw new TableApiError(400, "bad_select", `cannot parse select item ${item}`);
    const relation = match[2]!;
    const key = match[1] ?? relation;
    if (["__proto__", "constructor", "prototype"].includes(key)) {
      throw new TableApiError(400, "bad_select", `embed alias ${key} is not allowed`);
    }
    const innerRaw = match[3]!.trim();
    if (innerRaw.includes("(")) {
      throw new TableApiError(400, "nested_embed", "embeds are one level deep");
    }
    if (innerRaw === "") {
      throw new TableApiError(400, "bad_select", `embed ${key} needs * or a column list`);
    }
    let inner: string[] | null = [];
    for (const name of innerRaw.split(",").map((part) => part.trim())) {
      if (name === "*") {
        inner = null;
        break;
      }
      if (!isValidSqlIdent(name)) {
        throw new TableApiError(400, "bad_column", `column ${name} is not allowed`);
      }
      inner.push(name);
    }
    if (embeds.some((embed) => embed.key === key)) {
      throw new TableApiError(400, "bad_select", `duplicate embed ${key}`);
    }
    embeds.push({ key, relation, columns: inner });
  }
  if (embeds.length > MAX_EMBEDS) {
    throw new TableApiError(400, "cap_exceeded", `select allows at most ${MAX_EMBEDS} embeds`);
  }
  const select = star ? null : columns;
  if (select && embeds.length === 0 && select.length === 0) {
    throw new TableApiError(400, "bad_select", "select is empty");
  }
  return { select, embeds };
}

export function pkColumns(info: JordTableInfo): JordColumnInfo[] {
  return info.columns.filter((col) => col.pk);
}
