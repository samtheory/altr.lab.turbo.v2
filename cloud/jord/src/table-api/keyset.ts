import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { quoteIdent, type JordTableInfo } from "@altr/jord";

import { pkColumns, TableApiError, type ParsedTableQuery, type SqlValue } from "./query.js";

/**
 * Keyset (cursor) pagination, S0079.
 *
 * Cursor = base64url(JSON {t, s, o, v}) + "." + HMAC-SHA256. It carries the table, the effective
 * ORDER BY (columns + directions) and the last row's key values. Columns are never taken from the
 * cursor: the decoded order must equal the order derived from the request, so a cursor cannot
 * introduce any identifier. Values are always bound parameters. Policy/RLS scope is applied by the
 * same WHERE path as offset paging, so a cursor cannot widen what a caller can read.
 */

const SECRET = Buffer.from(process.env.JORD_CURSOR_SECRET || randomBytes(32).toString("hex"));

export type KeysetOrder = Array<{ column: string; dir: "asc" | "desc" }>;

type CursorBody = { t: string; s: string; o: string[]; v: SqlValue[] };

function mac(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

const bad = () => new TableApiError(400, "bad_cursor", "cursor is invalid");

/** Requested order plus primary-key tiebreakers so the ordering is total. */
export function keysetOrder(info: JordTableInfo, parsed: ParsedTableQuery): KeysetOrder {
  const pks = pkColumns(info);
  if (pks.length === 0) {
    throw new TableApiError(400, "no_key", "keyset paging needs a primary key");
  }
  const order: KeysetOrder = parsed.order.map((o) => ({ ...o }));
  for (const pk of pks) {
    if (!order.some((o) => o.column === pk.name)) order.push({ column: pk.name, dir: "asc" });
  }
  // `col > ?` is never true for NULL, so NULL rows would silently vanish from later pages.
  for (const o of order) {
    const col = info.columns.find((c) => c.name === o.column);
    if (col && !col.notnull && !col.pk) {
      throw new TableApiError(
        400,
        "nullable_order",
        `keyset order column ${o.column} must be NOT NULL`,
      );
    }
  }
  return order;
}

function orderSig(order: KeysetOrder): string[] {
  return order.map((o) => `${o.column}.${o.dir}`);
}

export function encodeCursor(
  info: JordTableInfo,
  order: KeysetOrder,
  row: Record<string, unknown>,
): string {
  const v = order.map((o): SqlValue => {
    const x = row[o.column];
    if (x === null || x === undefined) {
      throw new TableApiError(400, "null_key", `keyset column ${o.column} is null; use a NOT NULL order column`);
    }
    if (typeof x === "number" || typeof x === "string") return x;
    if (typeof x === "bigint") return x.toString();
    if (typeof x === "boolean") return x ? 1 : 0;
    if (x instanceof Date) return x.toISOString();
    throw new TableApiError(400, "bad_key_type", `keyset column ${o.column} has an unsupported value type`);
  });
  const body: CursorBody = { t: info.name, s: info.schema ?? "", o: orderSig(order), v };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${mac(payload)}`;
}

export function decodeCursor(
  info: JordTableInfo,
  order: KeysetOrder,
  raw: string,
): SqlValue[] {
  const dot = raw.indexOf(".");
  if (dot <= 0 || raw.length > 4096) throw bad();
  const payload = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const want = Buffer.from(mac(payload));
  if (given.length !== want.length || !timingSafeEqual(given, want)) throw bad();
  let body: CursorBody;
  try {
    body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CursorBody;
  } catch {
    throw bad();
  }
  const sig = orderSig(order);
  if (
    !body ||
    body.t !== info.name ||
    body.s !== (info.schema ?? "") ||
    !Array.isArray(body.o) ||
    body.o.length !== sig.length ||
    body.o.some((s, i) => s !== sig[i]) ||
    !Array.isArray(body.v) ||
    body.v.length !== order.length
  ) {
    throw bad();
  }
  // Values are bound parameters; the column's own affinity/cast handles comparison, so decode as-is.
  return body.v.map((val) => {
    if (typeof val !== "string" && typeof val !== "number") throw bad();
    return val;
  });
}

/**
 * `(a > ?) OR (a = ? AND b > ?) ...` — portable across libSQL and Postgres, supports mixed
 * ASC/DESC. Placeholders are `?` (rewritten for Postgres by the caller).
 */
export function keysetWhere(order: KeysetOrder, values: SqlValue[], args: SqlValue[]): string {
  const groups: string[] = [];
  for (let i = 0; i < order.length; i++) {
    const parts: string[] = [];
    for (let j = 0; j < i; j++) {
      parts.push(`${quoteIdent(order[j]!.column)} = ?`);
      args.push(values[j]!);
    }
    parts.push(`${quoteIdent(order[i]!.column)} ${order[i]!.dir === "desc" ? "<" : ">"} ?`);
    args.push(values[i]!);
    groups.push(`(${parts.join(" AND ")})`);
  }
  return `(${groups.join(" OR ")})`;
}
