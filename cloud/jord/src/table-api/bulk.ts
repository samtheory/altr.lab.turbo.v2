/**
 * S0080 — `POST /api/v1/:table/bulk`: batch insert / upsert with per-row results.
 *
 * Request: a bare JSON array of row objects (1..BULK_MAX_ROWS). Query params:
 *   - `on_conflict=col1,col2` — upsert target. Must equal the column set of the
 *     primary key or a non-partial UNIQUE index (introspected live). Else 400.
 *   - `resolution=merge|ignore` — default `merge` (update the existing row);
 *     `ignore` leaves it untouched. Requires `on_conflict`.
 *   - `atomic=true` — all-or-nothing (see below).
 *   - `schema=` — same as the single-row API.
 *   - `Prefer: return=representation` adds `data` (the written row) per result.
 *   Without `on_conflict` it is a plain insert; a duplicate key is that row's
 *   `{ status: 409, error: "conflict" }`, never a batch abort.
 *
 * DECISIONS
 * (a) Atomicity. Default is PER-ROW with partial success: the whole batch runs in
 *     one write-queue transaction, each row inside its own SAVEPOINT; a failing
 *     row is rolled back to its savepoint and reported, the others commit.
 *     `?atomic=true`: same transaction without savepoints; the first failing row
 *     aborts and rolls back everything, the response is that row's status
 *     (403 / 409 / 422 / 400) with `{ error, message, index }` and nothing is written.
 * (b) HTTP. 200 with `{ inserted, updated, ignored, failed, results: [...] }`
 *     (results in input order, each `{ index, status, op, id? , data? }` or
 *     `{ index, status, error, message, field?, reason? }`). 207 is NOT used.
 *     Request-level problems (bad JSON, > BULK_MAX_ROWS → 413, body over the
 *     global JSON cap → 413, bad params → 400, no write permission at all → 403)
 *     are plain error responses.
 *
 * AUTHORIZATION PARITY (with single-row POST / PATCH in routes.ts)
 *   - Same `evaluatePolicies` call per operation ("insert", and "update" when an
 *     upsert may merge) for the same principal; service bypasses exactly as there.
 *   - Insert branch: `stampInsertScope` on the raw row (owner/tenant columns are
 *     forced to the caller, as POST does), then `coerceBody` (same allowlist).
 *   - Update branch (row exists on the conflict target): needs UPDATE allowed,
 *     `patchKeepsScope` on the new values (cannot move the row / set the owner to
 *     someone else), the EXISTING row must be inside the caller's update scope
 *     (scoped prior select), and the UPDATE itself carries the scope predicate —
 *     the same `compilePriorSelect` / `compileUpdate` path PATCH uses. An
 *     owner-scoped caller therefore cannot overwrite another owner's row through
 *     `on_conflict`: that row is `{ status: 403, error: "policy_denied" }`. On
 *     Postgres FORCE RLS may hide the row first, then the insert collides and the
 *     row is `{ status: 409, error: "conflict" }`; nothing is written either way.
 *   - `resolution=ignore` on an existing row returns no row data.
 *   - Change events: one outbox draft per written row (insert / update with
 *     old+new row), in the same transaction, published after commit — the same
 *     `writeChangeAs` path single writes use. Failed / ignored rows emit nothing.
 *   - Idempotency-Key: covered by the protected-route middleware for `/api/v1/*`.
 *   - Driver errors are mapped to stable codes; raw messages are never returned.
 */
import type { JordDriverPort, JordTableInfo } from "@altr/jord";
import { quoteIdent } from "@altr/jord";
import type { Context } from "hono";

import type { JordAuthVariables } from "../auth/middleware.js";
import type { Principal } from "../auth/principal.js";
import {
  evaluatePolicies,
  patchKeepsScope,
  policiesDisabledFromEnv,
  stampInsertScope,
  type PolicyDecision,
} from "../policies/evaluate.js";
import type { JordChangeDraft, WriteWithChange } from "../realtime/types.js";
import { coerceBody, readJsonCapped, rowId } from "./body.js";
import { pkColumns, TableApiError, type Filter, type SqlValue } from "./query.js";
import {
  compileInsert,
  compilePriorSelect,
  compileUpdate,
  scopeFor,
  type ScopeFor,
} from "./sql.js";

export const BULK_MAX_ROWS = 500;

const SAVEPOINT = "jord_bulk_row";
const ALLOWED_PARAMS = new Set(["schema", "on_conflict", "resolution", "atomic"]);

type Dialect = "libsql" | "postgres";

export type BulkOptions = {
  onConflict: string[] | null;
  resolution: "merge" | "ignore";
  atomic: boolean;
  representation: boolean;
};

export type BulkRowFailure = {
  ok: false;
  index: number;
  status: number;
  error: string;
  message: string;
  field?: string;
  reason?: string;
};

type BulkRowSuccess = {
  ok: true;
  index: number;
  op: "insert" | "update" | "ignore";
  row: Record<string, unknown> | null;
  oldRow: Record<string, unknown> | null;
};

type BulkOutcome = BulkRowSuccess | BulkRowFailure;

type Prepared =
  | { index: number; raw: Record<string, unknown>; conflict: Filter[] }
  | { index: number; failure: BulkRowFailure };

class BulkAbort extends Error {
  constructor(readonly failure: BulkRowFailure) {
    super(failure.message);
  }
}

function fail(
  index: number,
  status: number,
  error: string,
  message: string,
  extra?: { field?: string; reason?: string },
): BulkRowFailure {
  return {
    ok: false,
    index,
    status,
    error,
    message,
    ...(extra?.field ? { field: extra.field, reason: extra.reason ?? message } : {}),
  };
}

function fromTableApiError(index: number, err: TableApiError): BulkRowFailure {
  return fail(index, err.status, err.code, err.message, { field: err.field, reason: err.reason });
}

export function parseBulkOptions(
  info: JordTableInfo,
  search: URLSearchParams,
  prefer: string | undefined,
): BulkOptions {
  for (const key of search.keys()) {
    if (!ALLOWED_PARAMS.has(key)) {
      throw new TableApiError(400, "bad_param", `unsupported parameter ${key}`);
    }
  }
  const rawConflict = search.get("on_conflict");
  let onConflict: string[] | null = null;
  if (rawConflict != null) {
    const names = [...new Set(rawConflict.split(",").map((s) => s.trim()).filter(Boolean))];
    if (names.length === 0) {
      throw new TableApiError(400, "bad_on_conflict", "on_conflict needs at least one column");
    }
    for (const name of names) {
      if (!info.columns.some((col) => col.name === name)) {
        throw new TableApiError(400, "bad_column", `unknown column ${name}`);
      }
    }
    onConflict = names;
  }
  const rawResolution = search.get("resolution");
  if (rawResolution != null && rawResolution !== "merge" && rawResolution !== "ignore") {
    throw new TableApiError(400, "bad_resolution", "resolution must be merge or ignore");
  }
  if (rawResolution != null && !onConflict) {
    throw new TableApiError(400, "bad_resolution", "resolution requires on_conflict");
  }
  const rawAtomic = search.get("atomic");
  if (rawAtomic != null && !["true", "false", "1", "0"].includes(rawAtomic)) {
    throw new TableApiError(400, "bad_atomic", "atomic must be true or false");
  }
  return {
    onConflict,
    resolution: rawResolution === "ignore" ? "ignore" : "merge",
    atomic: rawAtomic === "true" || rawAtomic === "1",
    representation: /return=representation/i.test(prefer ?? ""),
  };
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Postgres introspection of usable on_conflict targets: valid, ready, immediate
 * (non-deferrable) unique indexes, non-partial and non-expression.
 */
export const PG_UNIQUE_INDEX_SQL = `SELECT i.indexrelid::text AS idx, a.attname AS col
         FROM pg_index i
         JOIN pg_class c ON c.oid = i.indrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         CROSS JOIN LATERAL unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
         JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
        WHERE n.nspname = $1 AND c.relname = $2
          AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate
          AND i.indpred IS NULL AND i.indexprs IS NULL
          AND k.ord <= i.indnkeyatts
        ORDER BY i.indexrelid, k.ord`;

/**
 * Column sets that can identify one row: the primary key plus every
 * non-partial, non-expression UNIQUE index (live introspection, both dialects).
 */
export async function uniqueKeySets(
  jord: Pick<JordDriverPort, "query">,
  info: JordTableInfo,
  dialect: Dialect,
): Promise<string[][]> {
  const sets: string[][] = [];
  const pk = pkColumns(info).map((col) => col.name);
  if (pk.length > 0) sets.push(pk);
  if (dialect === "postgres") {
    const rows = await jord.query(PG_UNIQUE_INDEX_SQL, [info.schema ?? "public", info.name]);
    const byIndex = new Map<string, string[]>();
    for (const row of rows) {
      const key = String(row.idx);
      const list = byIndex.get(key) ?? [];
      list.push(String(row.col));
      byIndex.set(key, list);
    }
    sets.push(...byIndex.values());
    return sets;
  }
  const schema = quoteIdent(info.schema ?? "main");
  const indexes = await jord.query(`PRAGMA ${schema}.index_list(${sqlLiteral(info.name)})`);
  for (const idx of indexes) {
    if (Number(idx.unique) !== 1 || Number(idx.partial ?? 0) !== 0) continue;
    const cols = await jord.query(`PRAGMA ${schema}.index_info(${sqlLiteral(String(idx.name))})`);
    const ordered = [...cols].sort((a, b) => Number(a.seqno) - Number(b.seqno));
    if (ordered.length === 0 || ordered.some((col) => col.name == null)) continue;
    sets.push(ordered.map((col) => String(col.name)));
  }
  return sets;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((name) => b.includes(name));
}

function errorText(err: unknown, depth = 0): string {
  if (!err || typeof err !== "object" || depth > 3) return "";
  const rec = err as { code?: unknown; message?: unknown; cause?: unknown };
  return [
    typeof rec.code === "string" ? rec.code : "",
    typeof rec.message === "string" ? rec.message : "",
    errorText(rec.cause, depth + 1),
  ].join(" ");
}

function pgCode(err: unknown, depth = 0): string | null {
  if (!err || typeof err !== "object" || depth > 3) return null;
  const rec = err as { code?: unknown; cause?: unknown };
  if (typeof rec.code === "string" && /^[0-9A-Z]{5}$/.test(rec.code)) return rec.code;
  return pgCode(rec.cause, depth + 1);
}

/**
 * Driver error → stable per-row code. Never returns the driver's message; a
 * `field` is only reported when it names a column of this table.
 */
export function mapDriverError(index: number, err: unknown, info: JordTableInfo): BulkRowFailure {
  const text = errorText(err);
  const lower = text.toLowerCase();
  const code = pgCode(err);
  const known = (name: string | undefined) =>
    name && info.columns.some((col) => col.name === name) ? name : undefined;
  if (code === "23505" || /unique constraint failed|sqlite_constraint_(primarykey|unique)/.test(lower)) {
    return fail(index, 409, "conflict", "a row with the same key already exists");
  }
  if (code === "23503" || /foreign key constraint failed|sqlite_constraint_foreignkey/.test(lower)) {
    return fail(index, 409, "foreign_key_violation", "referenced row does not exist");
  }
  if (code === "23502" || /not null constraint failed|sqlite_constraint_notnull/.test(lower)) {
    const pgColumn = (err as { column?: unknown }).column;
    const sqliteColumn = /not null constraint failed: [^\s.]+\.([A-Za-z_][A-Za-z0-9_]*)/i.exec(text)?.[1];
    const field = known(typeof pgColumn === "string" ? pgColumn : sqliteColumn);
    return fail(index, 422, "not_null_violation", "a required column is missing", {
      field,
      reason: "required",
    });
  }
  if (code === "23514" || /check constraint failed|sqlite_constraint_check/.test(lower)) {
    return fail(index, 422, "check_violation", "row violates a check constraint");
  }
  if ((code && code.startsWith("22")) || /datatype mismatch|sqlite_mismatch/.test(lower)) {
    return fail(index, 422, "invalid_value", "a value does not fit its column");
  }
  console.error("[@altr/jord-server] bulk row write failed", err);
  return fail(index, 500, "write_failed", "row could not be written");
}

function prepareRow(index: number, item: unknown, info: JordTableInfo, opts: BulkOptions): Prepared {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return { index, failure: fail(index, 400, "bad_row", "each row must be a JSON object") };
  }
  const raw = item as Record<string, unknown>;
  let values: Record<string, SqlValue>;
  try {
    // Same allowlist + validation as single-row writes; re-run after stamping.
    values = coerceBody(info, raw);
  } catch (err) {
    if (err instanceof TableApiError) return { index, failure: fromTableApiError(index, err) };
    throw err;
  }
  if (Object.keys(values).length === 0) {
    return { index, failure: fail(index, 400, "bad_row", "row has no columns") };
  }
  const conflict: Filter[] = [];
  for (const column of opts.onConflict ?? []) {
    const value = values[column];
    if (value == null) {
      return {
        index,
        failure: fail(index, 422, "missing_conflict_value", `${column} is required for on_conflict`, {
          field: column,
          reason: "required",
        }),
      };
    }
    conflict.push({ column, op: "eq", values: [value] });
  }
  return { index, raw, conflict };
}

export async function handleBulk(
  c: Context<{ Variables: JordAuthVariables }>,
  ctx: {
    jord: JordDriverPort;
    writeChangeAs: (principal: Principal) => WriteWithChange;
    maxJsonBytes: number;
    info: JordTableInfo;
    schema: string;
    dialect: Dialect;
  },
): Promise<Response> {
  const { jord, info, dialect } = ctx;
  const url = new URL(c.req.url);
  const opts = parseBulkOptions(info, url.searchParams, c.req.header("prefer"));

  const body = await readJsonCapped(c.req, ctx.maxJsonBytes);
  if (!Array.isArray(body)) {
    throw new TableApiError(400, "bad_body", "JSON array of rows is required");
  }
  if (body.length === 0) {
    throw new TableApiError(400, "bad_body", "at least one row is required");
  }
  if (body.length > BULK_MAX_ROWS) {
    throw new TableApiError(413, "too_many_rows", `at most ${BULK_MAX_ROWS} rows per request`);
  }

  if (opts.onConflict) {
    const keys = await uniqueKeySets(jord, info, dialect);
    if (!keys.some((set) => sameSet(set, opts.onConflict!))) {
      throw new TableApiError(
        400,
        "bad_on_conflict",
        "on_conflict must name the primary key or a unique index of the table",
      );
    }
  }

  // Policy decisions: the exact call routes.ts makes for POST / PATCH.
  const principal = c.get("principal");
  const decide = (operation: "insert" | "update"): Promise<PolicyDecision> =>
    evaluatePolicies({
      jord,
      tableName: info.name,
      schema: ctx.schema,
      operation,
      role: principal.role,
      subject: principal.kind,
      uid: principal.uid ?? null,
      claims: principal.claims,
      bypass: principal.kind === "service" || policiesDisabledFromEnv(),
    });
  const insertDecision = await decide("insert");
  const mayMerge = opts.onConflict != null && opts.resolution === "merge";
  const updateDecision = mayMerge ? await decide("update") : null;
  if (!insertDecision.allowed && !updateDecision?.allowed) {
    return c.json({ error: "policy_denied", message: "policy denied" }, 403);
  }
  const scopeOf = (decision: PolicyDecision | null): ScopeFor | undefined =>
    principal.kind === "service" || !decision || !decision.allowed
      ? undefined
      : scopeFor(info, decision.scope);
  const insertScope = scopeOf(insertDecision);
  const updateScope = scopeOf(updateDecision);

  const prepared = body.map((item, index) => prepareRow(index, item, info, opts));
  if (opts.atomic) {
    const first = prepared.find((p): p is Extract<Prepared, { failure: BulkRowFailure }> => "failure" in p);
    if (first) return atomicFailure(c, first.failure);
  }

  const keys = pkColumns(info).map((col) => col.name);
  const blobColumns = info.columns.filter((col) => /BLOB|BYTEA/i.test(col.type)).map((col) => col.name);
  const hasVersion = info.columns.some((col) => col.name === "version");
  const q = (sql: string, args: SqlValue[] = []) => jord.query(sql, args);

  async function insertRow(index: number, raw: Record<string, unknown>): Promise<BulkOutcome> {
    if (!insertDecision.allowed) return fail(index, 403, "policy_denied", "policy denied");
    let stamped: Record<string, unknown> | null = raw;
    if (insertScope) {
      stamped = stampInsertScope(insertScope.scope, raw);
      if (!stamped) return fail(index, 403, "policy_denied", "policy denied");
    }
    const compiled = compileInsert(info, coerceBody(info, stamped), dialect);
    const rows = await q(compiled.sql, compiled.args);
    return { ok: true, index, op: "insert", row: rows[0] ?? null, oldRow: null };
  }

  async function writeRow(p: Extract<Prepared, { raw: Record<string, unknown> }>): Promise<BulkOutcome> {
    const { index, raw, conflict } = p;
    if (!opts.onConflict) return insertRow(index, raw);

    // Branch on the unscoped row; authorization is decided below. On PG this probe
    // is a plain SELECT of the key columns (no FOR UPDATE) so a scoped caller can
    // never lock other owners' rows; the lock is taken below, on the row read in
    // the caller's scope. A concurrent insert/delete between probe and lock
    // surfaces as a unique violation (409) or an empty locked read, never a bypass.
    const existsSql =
      dialect === "postgres"
        ? compilePriorSelect(info, conflict, dialect, false, undefined, {
            lock: false,
            columns: conflict.map((f) => f.column),
          })
        : compilePriorSelect(info, conflict, dialect, false, undefined);
    const existing = await q(existsSql.sql, existsSql.args);
    if (existing.length === 0) return insertRow(index, raw);
    if (opts.resolution === "ignore") {
      return { ok: true, index, op: "ignore", row: null, oldRow: null };
    }

    // Update branch: UPDATE permission + new values stay in scope + EXISTING row in scope.
    if (!updateDecision?.allowed) return fail(index, 403, "policy_denied", "policy denied");
    if (updateScope && !patchKeepsScope(updateScope.scope, raw)) {
      return fail(index, 403, "policy_denied", "row would move out of scope");
    }
    let previous = existing;
    if (updateScope || dialect === "postgres") {
      // Full row read in the caller's scope; on PG this is the FOR UPDATE lock.
      const scopedSql = compilePriorSelect(info, conflict, dialect, false, updateScope);
      previous = await q(scopedSql.sql, scopedSql.args);
      if (previous.length === 0) {
        return updateScope
          ? fail(index, 403, "policy_denied", "policy denied")
          : fail(index, 409, "conflict", "row changed concurrently");
      }
    }
    const filters = [...conflict];
    const bump = hasVersion && typeof raw.version === "number";
    if (bump) {
      if (previous.some((row) => Number(row.version) !== raw.version)) {
        return fail(index, 409, "version_conflict", "version did not match");
      }
      filters.push({ column: "version", op: "eq", values: [raw.version as number] });
    }
    const compiled = compileUpdate(
      info,
      coerceBody(info, raw),
      filters,
      dialect,
      bump,
      false,
      updateScope,
      { keys, rows: previous },
    );
    const rows = await q(compiled.sql, compiled.args);
    if (rows.length === 0) return fail(index, 403, "policy_denied", "policy denied");
    return { ok: true, index, op: "update", row: rows[0] ?? null, oldRow: previous[0] ?? null };
  }

  async function attempt(p: Extract<Prepared, { raw: Record<string, unknown> }>): Promise<BulkOutcome> {
    try {
      return await writeRow(p);
    } catch (err) {
      if (err instanceof TableApiError) return fromTableApiError(p.index, err);
      return mapDriverError(p.index, err, info);
    }
  }

  let outcomes: BulkOutcome[];
  try {
    outcomes = await ctx.writeChangeAs(principal)(
      async () => {
        const out: BulkOutcome[] = [];
        for (const p of prepared) {
          if ("failure" in p) {
            out.push(p.failure);
            continue;
          }
          if (opts.atomic) {
            const result = await attempt(p);
            if (!result.ok) throw new BulkAbort(result);
            out.push(result);
            continue;
          }
          await q(`SAVEPOINT ${SAVEPOINT}`);
          const result = await attempt(p);
          if (!result.ok) await q(`ROLLBACK TO SAVEPOINT ${SAVEPOINT}`);
          await q(`RELEASE SAVEPOINT ${SAVEPOINT}`);
          out.push(result);
        }
        return out;
      },
      (out): JordChangeDraft[] =>
        out.flatMap((o) =>
          o.ok && o.op !== "ignore" && o.row
            ? [
                {
                  table: info.name,
                  schema: ctx.schema,
                  op: o.op,
                  id: rowId(keys, o.row),
                  oldRow: o.op === "update" ? o.oldRow : null,
                  newRow: o.row,
                  blobColumns,
                },
              ]
            : [],
        ),
    );
  } catch (err) {
    if (err instanceof BulkAbort) return atomicFailure(c, err.failure);
    throw err;
  }

  let inserted = 0;
  let updated = 0;
  let ignored = 0;
  let failed = 0;
  const results = outcomes.map((o) => {
    if (!o.ok) {
      failed += 1;
      const { ok: _ok, ...rest } = o;
      return rest;
    }
    if (o.op === "insert") inserted += 1;
    else if (o.op === "update") updated += 1;
    else ignored += 1;
    return {
      index: o.index,
      status: o.op === "insert" ? 201 : 200,
      op: o.op,
      ...(o.row && keys.length > 0 ? { id: rowId(keys, o.row) } : {}),
      ...(opts.representation && o.row ? { data: o.row } : {}),
    };
  });
  return c.json({ inserted, updated, ignored, failed, results }, 200);
}

function atomicFailure(c: Context, failure: BulkRowFailure): Response {
  const { ok: _ok, status, error, message, index, field, reason } = failure;
  return c.json(
    { error, message, index, ...(field ? { field, reason } : {}) },
    status as 400 | 403 | 409 | 422 | 500,
  );
}
