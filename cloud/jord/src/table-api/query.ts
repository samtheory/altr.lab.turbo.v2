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
};

export class TableApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "TableApiError";
    this.status = status;
    this.code = code;
  }
}

const RESERVED_PARAMS = new Set([
  "select",
  "order",
  "limit",
  "offset",
  "all",
  "pk",
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
  const selectRaw = search.get("select");
  if (selectRaw != null && selectRaw !== "" && selectRaw !== "*") {
    select = selectRaw.split(",").map((name) => requireColumn(info, name.trim()).name);
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
  };
}

export function pkColumns(info: JordTableInfo): JordColumnInfo[] {
  return info.columns.filter((col) => col.pk);
}
