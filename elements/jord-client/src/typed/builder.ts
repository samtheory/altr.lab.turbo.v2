import { readResponseBody } from "../table-fetch.js";
import type {
  CreateClientOptions,
  JordError,
  JordResult,
  TypedClient,
} from "./types.js";

type Shape = "many" | "one" | "maybe";
type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface State {
  schema: string;
  table: string;
  method: Method;
  body?: unknown;
  select: string | null;
  params: ReadonlyArray<readonly [string, string]>;
  orders: readonly string[];
  limit: number | null;
  offset: number | null;
  cursor: string | null;
  count: "exact" | "planned" | null;
  shape: Shape;
  invalid: string | null;
}

interface Env {
  base: string;
  key: string;
  fetchImpl: typeof fetch;
}

const enc = encodeURIComponent;

function scalar(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean" || typeof value === "bigint") return String(value);
  return null;
}

/** Quote a value inside `in.(...)` / `or=(...)` when it holds grammar characters. */
export function quoteListValue(raw: string): string {
  if (raw !== "" && !/[,()"\\\s]/.test(raw)) return raw;
  return `"${raw.replace(/[\\"]/g, "\\$&")}"`;
}

/** Runtime identifier check: types are erased, so `as any` callers must not smuggle grammar. */
const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const OP_SET = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"]);

function orPiece(cond: readonly unknown[]): string | null {
  const [col, op, value] = cond;
  if (typeof col !== "string" || typeof op !== "string" || !OP_SET.has(op)) return null;
  if (!IDENT.test(col)) return null;
  if (op === "is") return value === null || value === "notnull" ? `${col}.is.${value ?? "null"}` : null;
  if (op === "in") {
    if (!Array.isArray(value)) return null;
    const parts = value.map(scalar);
    if (parts.some((p) => p === null)) return null;
    return `${col}.in.(${(parts as string[]).map(quoteListValue).join(",")})`;
  }
  const s = scalar(value);
  return s === null ? null : `${col}.${op}.${quoteListValue(s)}`;
}

function parseError(status: number, body: unknown, fallback: string): JordError {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const code = typeof b.error === "string" ? b.error : "http_error";
    const message = typeof b.message === "string" ? b.message : code;
    return { status, code, message };
  }
  return { status, code: "http_error", message: typeof body === "string" && body ? body : fallback };
}

class QueryImpl {
  private flight: Promise<JordResult<unknown>> | null = null;

  constructor(
    private readonly env: Env,
    readonly state: State,
  ) {}

  private with(patch: Partial<State>): QueryImpl {
    return new QueryImpl(this.env, { ...this.state, ...patch });
  }

  private filter(column: string, op: string, value: unknown): QueryImpl {
    if (!IDENT.test(column)) return this.with({ invalid: `${op}: invalid column name` });
    const s = scalar(value);
    if (s === null) return this.with({ invalid: `${op}: unsupported value for ${column}` });
    return this.with({ params: [...this.state.params, [column, `${op}.${s}`]] });
  }

  eq(c: string, v: unknown) { return this.filter(c, "eq", v); }
  neq(c: string, v: unknown) { return this.filter(c, "neq", v); }
  gt(c: string, v: unknown) { return this.filter(c, "gt", v); }
  gte(c: string, v: unknown) { return this.filter(c, "gte", v); }
  lt(c: string, v: unknown) { return this.filter(c, "lt", v); }
  lte(c: string, v: unknown) { return this.filter(c, "lte", v); }
  like(c: string, v: string) { return this.filter(c, "like", v); }
  ilike(c: string, v: string) { return this.filter(c, "ilike", v); }

  in(column: string, values: readonly unknown[]) {
    if (!IDENT.test(column)) return this.with({ invalid: "in: invalid column name" });
    const parts = values.map(scalar);
    if (parts.some((p) => p === null)) return this.with({ invalid: `in: unsupported value for ${column}` });
    const list = (parts as string[]).map(quoteListValue).join(",");
    return this.with({ params: [...this.state.params, [column, `in.(${list})`]] });
  }

  is(column: string, value: null | "notnull") {
    if (!IDENT.test(column)) return this.with({ invalid: "is: invalid column name" });
    if (value !== null && value !== "notnull") return this.with({ invalid: "is: expects null or 'notnull'" });
    return this.with({ params: [...this.state.params, [column, `is.${value ?? "null"}`]] });
  }

  or(conditions: readonly (readonly unknown[])[]) {
    const pieces = conditions.map(orPiece);
    if (pieces.length === 0 || pieces.some((p) => p === null)) {
      return this.with({ invalid: "or: needs valid [column, operator, value] conditions" });
    }
    return this.with({ params: [...this.state.params, ["or", `(${pieces.join(",")})`]] });
  }

  order(column: string, options?: { ascending?: boolean }) {
    if (!IDENT.test(column)) return this.with({ invalid: "order: invalid column name" });
    const dir = options?.ascending === false ? "desc" : "asc";
    return this.with({ orders: [...this.state.orders, `${column}.${dir}`] });
  }

  limit(n: number) {
    if (!Number.isInteger(n) || n < 1) return this.with({ invalid: "limit must be a positive integer" });
    return this.with({ limit: n });
  }

  range(from: number, to: number) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from) {
      return this.with({ invalid: "range needs integers with 0 <= from <= to" });
    }
    return this.with({ offset: from, limit: to - from + 1 });
  }

  count(mode: "exact" | "planned" = "exact") {
    return this.with({ count: mode });
  }

  cursor(token = "") {
    return this.with({ cursor: token });
  }

  select(columns = "*") {
    return this.with({ select: columns.replace(/\s+/g, "") });
  }

  single() {
    return this.with({ shape: "one" });
  }

  maybeSingle() {
    return this.with({ shape: "maybe" });
  }

  async *paginate(options: { pageSize?: number; maxPages?: number } = {}) {
    const pageSize = options.pageSize ?? this.state.limit;
    const maxPages = options.maxPages ?? 1000;
    if (this.state.method !== "GET") {
      yield this.fail(0, "bad_request", "paginate is only available on reads") as JordResult<unknown[]>;
      return;
    }
    if (pageSize !== null && (!Number.isInteger(pageSize) || pageSize < 1)) {
      yield this.fail(0, "bad_request", "pageSize must be a positive integer") as JordResult<unknown[]>;
      return;
    }
    let q = this.with({ cursor: "", limit: pageSize });
    const seen = new Set<string>();
    for (let pages = 0; pages < maxPages; pages++) {
      const page = (await q) as JordResult<unknown[]>;
      yield page;
      if (page.error || !page.hasMore || !page.nextCursor) return;
      // A server that repeats a cursor would loop forever.
      if (seen.has(page.nextCursor)) return;
      seen.add(page.nextCursor);
      q = q.cursor(page.nextCursor);
    }
  }

  /** Full request URL (exposed for tests). */
  url(): string {
    const s = this.state;
    const qs: string[] = [`schema=${enc(s.schema)}`];
    if (s.select !== null && s.method === "GET" && s.select !== "*") qs.push(`select=${enc(s.select)}`);
    if (s.select !== null && s.method !== "GET") qs.push(`select=${enc(s.select)}`);
    for (const [k, v] of s.params) qs.push(`${enc(k)}=${enc(v)}`);
    if (s.orders.length) qs.push(`order=${enc(s.orders.join(","))}`);
    if (s.limit !== null) qs.push(`limit=${s.limit}`);
    if (s.offset !== null) qs.push(`offset=${s.offset}`);
    if (s.cursor !== null) qs.push(`cursor=${enc(s.cursor)}`);
    return `${this.env.base}/api/v1/${enc(s.table)}?${qs.join("&")}`;
  }

  then<A, B>(
    onFulfilled?: ((value: JordResult<unknown>) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): Promise<A | B> {
    this.flight ??= this.execute();
    return this.flight.then(onFulfilled, onRejected);
  }

  private fail(status: number, code: string, message: string, meta?: Partial<JordResult<unknown>>) {
    return { data: null, error: { status, code, message }, count: null, nextCursor: null, hasMore: null, status, ...meta } as JordResult<unknown>;
  }

  private async execute(): Promise<JordResult<unknown>> {
    const s = this.state;
    if (s.invalid) return this.fail(0, "bad_request", s.invalid);
    if (!IDENT.test(s.schema) || !IDENT.test(s.table)) {
      return this.fail(0, "bad_request", "invalid schema or table name");
    }
    const headers: Record<string, string> = {
      apikey: this.env.key,
      authorization: `Bearer ${this.env.key}`,
      accept: "application/json",
    };
    const prefer: string[] = [];
    if (s.method !== "GET") prefer.push("return=representation");
    if (s.count) prefer.push(`count=${s.count}`);
    if (prefer.length) headers.prefer = prefer.join(",");
    // Never follow a redirect with the apikey / Authorization headers attached.
    const init: RequestInit = { method: s.method, headers, redirect: "error" };
    if (s.method === "POST" || s.method === "PATCH") {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(s.body);
    }
    let res: Response;
    let body: unknown;
    try {
      res = await this.env.fetchImpl(this.url(), init);
      body = await readResponseBody(res);
    } catch (e) {
      return this.fail(0, "network_error", e instanceof Error ? e.message : String(e));
    }
    if (!res.ok) {
      const error = parseError(res.status, body, res.statusText || "request failed");
      return { data: null, error, count: null, nextCursor: null, hasMore: null, status: res.status };
    }
    const obj = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
    const raw = obj && "data" in obj ? obj.data : Array.isArray(body) ? body : obj ? [] : null;
    if (raw === null || raw === undefined) {
      return this.fail(res.status, "bad_response", "response has no data", { status: res.status });
    }
    const rows: unknown[] = Array.isArray(raw) ? raw : [raw];
    const meta = {
      status: res.status,
      count: typeof obj?.count === "number" ? obj.count : null,
      nextCursor: typeof obj?.next_cursor === "string" ? obj.next_cursor : null,
      hasMore: typeof obj?.has_more === "boolean" ? obj.has_more : null,
    };
    if (s.shape === "many") return { data: rows, error: null, ...meta } as JordResult<unknown>;
    if (rows.length === 1) return { data: rows[0], error: null, ...meta } as JordResult<unknown>;
    if (rows.length === 0 && s.shape === "maybe") return { data: null, error: null, ...meta } as unknown as JordResult<unknown>;
    const message = rows.length === 0 ? "no rows returned" : `${rows.length} rows returned, expected one`;
    return this.fail(406, rows.length === 0 ? "no_rows" : "multiple_rows", message, meta);
  }
}

/**
 * Typed client over the Table API. Extends the untyped package (shares its body reader and wire
 * format) and has no runtime dependencies. Each awaited query sends exactly one request.
 */
export function createClient<DB>(options: CreateClientOptions): TypedClient<DB> {
  const env: Env = {
    base: options.url.replace(/\/+$/, ""),
    key: options.key,
    fetchImpl: options.fetch ?? ((input, init) => fetch(input, init)),
  };
  const open = (key: string, method: Method, extra: Partial<State> = {}) => {
    const dot = key.indexOf(".");
    const schema = dot === -1 ? "public" : key.slice(0, dot);
    const table = dot === -1 ? key : key.slice(dot + 1);
    return new QueryImpl(env, {
      schema,
      table,
      method,
      select: null,
      params: [],
      orders: [],
      limit: null,
      offset: null,
      cursor: null,
      count: null,
      shape: "many",
      invalid: null,
      ...extra,
    });
  };
  return {
    from(key: string) {
      return {
        select: (columns?: string) => open(key, "GET").select(columns),
        insert: (values: unknown) => open(key, "POST", { body: values }),
        update: (patch: unknown) => open(key, "PATCH", { body: patch }),
        delete: () => open(key, "DELETE"),
      };
    },
  } as unknown as TypedClient<DB>;
}
